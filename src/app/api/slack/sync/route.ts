import { NextRequest, NextResponse } from 'next/server';
import { getBotInstallation, slackApi, slackPaginate, SlackApiResponse } from '@/lib/slack/client';
import { slackTsToIso } from '@/lib/slack/config';
import { getHubUser, isCoordinatorRole } from '@/lib/slack/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CLIENT_PREFIX = 'cli-';
const DEFAULT_DAYS = 7;

interface SlackConversation {
  id: string;
  name: string;
  is_member: boolean;
  is_archived: boolean;
}

interface SlackHistoryMessage {
  ts: string;
  text?: string;
  user?: string;
  subtype?: string;
  thread_ts?: string;
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Backfill: registra los canales donde está el bot (sugiriendo empresa por
 * convención "cli-<empresa>") y recarga mensajes recientes y fijados de los
 * canales vinculados. Lo lanza un coordinador o un cron con SLACK_SYNC_CRON_SECRET.
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.SLACK_SYNC_CRON_SECRET;
  const isCron = Boolean(cronSecret) && req.headers.get('authorization') === `Bearer ${cronSecret}`;
  if (!isCron) {
    const user = await getHubUser();
    if (!user || !isCoordinatorRole(user.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  const install = await getBotInstallation();
  if (!install) return NextResponse.json({ error: 'slack_not_connected' }, { status: 409 });

  const days = Number(req.nextUrl.searchParams.get('days')) || DEFAULT_DAYS;
  const oldest = String(Date.now() / 1000 - days * 86400);
  const supabase = createAdminSupabaseClient();

  // 1. Canales del bot -> slack_channel_links
  const conversations = await slackPaginate<SlackConversation>(
    'conversations.list',
    { types: 'public_channel,private_channel', exclude_archived: true },
    install.token,
    (page) => (page.channels as SlackConversation[]) || []
  );
  const botChannels = conversations.filter((c) => c.is_member);

  const [{ data: existing }, { data: companies }] = await Promise.all([
    supabase.from('slack_channel_links').select('slack_channel_id'),
    supabase.from('companies').select('id, name'),
  ]);
  const existingIds = new Set((existing || []).map((r) => r.slack_channel_id));
  const companyBySlug = new Map((companies || []).map((c) => [slugify(c.name), c.id as string]));

  const newLinks = botChannels
    .filter((c) => !existingIds.has(c.id))
    .map((c) => {
      const isClient = c.name.startsWith(CLIENT_PREFIX);
      return {
        slack_channel_id: c.id,
        team_id: install.teamId,
        name: c.name,
        kind: isClient ? 'client' : 'group',
        company_id: isClient ? companyBySlug.get(c.name.slice(CLIENT_PREFIX.length)) || null : null,
      };
    });
  if (newLinks.length > 0) await supabase.from('slack_channel_links').insert(newLinks);

  for (const c of botChannels.filter((ch) => existingIds.has(ch.id))) {
    await supabase.from('slack_channel_links').update({ name: c.name, is_archived: false }).eq('slack_channel_id', c.id);
  }

  // 2. Mensajes recientes y fijados de los canales vinculados
  const { data: links } = await supabase
    .from('slack_channel_links')
    .select('slack_channel_id')
    .eq('is_archived', false);

  let messageCount = 0;
  let pinCount = 0;
  const failures: string[] = [];

  for (const { slack_channel_id: channel } of links || []) {
    try {
      const history = await slackApi<SlackApiResponse & { messages: SlackHistoryMessage[] }>(
        'conversations.history',
        { channel, oldest, limit: 200 },
        install.token
      );
      const rows = history.messages
        .filter((m) => !m.subtype || m.subtype === 'thread_broadcast')
        .map((m) => ({
          slack_channel_id: channel,
          ts: m.ts,
          thread_ts: m.thread_ts || null,
          slack_user_id: m.user || null,
          text: (m.text || '').slice(0, 2000),
          posted_at: slackTsToIso(m.ts),
        }));
      if (rows.length > 0) {
        await supabase.from('slack_messages').upsert(rows);
        const latest = rows.reduce((a, b) => (a.posted_at > b.posted_at ? a : b));
        await supabase
          .from('slack_channel_links')
          .update({ last_message_at: latest.posted_at })
          .eq('slack_channel_id', channel);
        messageCount += rows.length;
      }

      const pins = await slackApi<
        SlackApiResponse & { items: Array<{ type: string; created: number; message?: SlackHistoryMessage & { permalink?: string } }> }
      >('pins.list', { channel }, install.token);
      const pinRows = pins.items
        .filter((p) => p.type === 'message' && p.message)
        .map((p) => ({
          slack_channel_id: channel,
          ts: p.message!.ts,
          slack_user_id: p.message!.user || null,
          text: (p.message!.text || '').slice(0, 2000),
          permalink: p.message!.permalink || null,
          posted_at: slackTsToIso(p.message!.ts),
          is_pinned: true,
          pinned_at: new Date(p.created * 1000).toISOString(),
        }));
      // pins.list es la verdad: se desfija lo que ya no aparece antes de volver a marcar.
      await supabase
        .from('slack_messages')
        .update({ is_pinned: false, pinned_at: null })
        .eq('slack_channel_id', channel)
        .eq('is_pinned', true);
      if (pinRows.length > 0) {
        await supabase.from('slack_messages').upsert(pinRows);
        pinCount += pinRows.length;
      }
    } catch (e) {
      failures.push(`${channel}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({
    ok: true,
    channels: botChannels.length,
    newChannels: newLinks.length,
    messages: messageCount,
    pins: pinCount,
    failures,
  });
}
