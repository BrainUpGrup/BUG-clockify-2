import { NextRequest, NextResponse } from 'next/server';
import { getSlackConfig, slackTsToIso } from '@/lib/slack/config';
import { verifySlackSignature } from '@/lib/slack/verify';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_TEXT = 2000;

type SlackEvent = {
  type: string;
  subtype?: string;
  channel?: string | { id: string; name?: string };
  channel_id?: string;
  user?: string;
  text?: string;
  ts?: string;
  thread_ts?: string;
  message?: { ts: string; text?: string; user?: string; thread_ts?: string };
  deleted_ts?: string;
  item?: { type: string; channel?: string; message?: { ts: string; text?: string; user?: string; permalink?: string } };
};

/**
 * Events API de Slack. Debe responder en < 3 s: solo escribe en Supabase.
 * Los upserts son idempotentes, así que los reintentos de Slack no duplican nada.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const { signingSecret } = getSlackConfig();

  if (
    !verifySlackSignature(
      signingSecret,
      rawBody,
      req.headers.get('x-slack-request-timestamp'),
      req.headers.get('x-slack-signature')
    )
  ) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  if (payload.type === 'url_verification') {
    return NextResponse.json({ challenge: payload.challenge });
  }

  if (payload.type === 'event_callback' && payload.event) {
    try {
      await handleEvent(payload.event as SlackEvent);
    } catch (e) {
      console.error('[slack/events]', e);
    }
  }

  return NextResponse.json({ ok: true });
}

async function handleEvent(event: SlackEvent) {
  const supabase = createAdminSupabaseClient();

  switch (event.type) {
    case 'message': {
      const channelId = typeof event.channel === 'string' ? event.channel : undefined;
      if (!channelId || !(await isLinkedChannel(channelId))) return;

      if (event.subtype === 'message_deleted' && event.deleted_ts) {
        await supabase.from('slack_messages').delete().eq('slack_channel_id', channelId).eq('ts', event.deleted_ts);
        return;
      }

      if (event.subtype === 'message_changed' && event.message) {
        await supabase
          .from('slack_messages')
          .update({ text: (event.message.text || '').slice(0, MAX_TEXT) })
          .eq('slack_channel_id', channelId)
          .eq('ts', event.message.ts);
        return;
      }

      // Ignorar mensajes de sistema (joins, bots, etc.); conservar los normales y los enviados al canal desde un hilo.
      if (event.subtype && event.subtype !== 'thread_broadcast') return;
      if (!event.ts) return;

      const postedAt = slackTsToIso(event.ts);
      await supabase.from('slack_messages').upsert({
        slack_channel_id: channelId,
        ts: event.ts,
        thread_ts: event.thread_ts || null,
        slack_user_id: event.user || null,
        text: (event.text || '').slice(0, MAX_TEXT),
        posted_at: postedAt,
      });
      // Las respuestas en hilo no cuentan como novedad del canal.
      if (!event.thread_ts || event.thread_ts === event.ts || event.subtype === 'thread_broadcast') {
        await supabase.from('slack_channel_links').update({ last_message_at: postedAt }).eq('slack_channel_id', channelId);
      }
      return;
    }

    case 'pin_added':
    case 'pin_removed': {
      const channelId = event.channel_id || event.item?.channel;
      const msg = event.item?.message;
      if (event.item?.type !== 'message' || !channelId || !msg || !(await isLinkedChannel(channelId))) return;

      const pinned = event.type === 'pin_added';
      await supabase.from('slack_messages').upsert({
        slack_channel_id: channelId,
        ts: msg.ts,
        slack_user_id: msg.user || null,
        text: (msg.text || '').slice(0, MAX_TEXT),
        permalink: msg.permalink || null,
        posted_at: slackTsToIso(msg.ts),
        is_pinned: pinned,
        pinned_at: pinned ? new Date().toISOString() : null,
      });
      return;
    }

    case 'channel_rename': {
      if (typeof event.channel === 'object' && event.channel.name) {
        await supabase
          .from('slack_channel_links')
          .update({ name: event.channel.name })
          .eq('slack_channel_id', event.channel.id);
      }
      return;
    }

    case 'channel_archive':
    case 'channel_unarchive': {
      const channelId = typeof event.channel === 'string' ? event.channel : event.channel?.id;
      if (!channelId) return;
      await supabase
        .from('slack_channel_links')
        .update({ is_archived: event.type === 'channel_archive' })
        .eq('slack_channel_id', channelId);
      return;
    }
  }
}

async function isLinkedChannel(channelId: string): Promise<boolean> {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from('slack_channel_links')
    .select('slack_channel_id')
    .eq('slack_channel_id', channelId)
    .maybeSingle();
  return Boolean(data);
}
