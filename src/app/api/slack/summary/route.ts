import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { slackChannelUrl } from '@/lib/slack/config';
import { SlackSummary } from '@/types/slack';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PINNED_LIMIT = 6;
const NO_VISIT_WINDOW_DAYS = 7;

/**
 * Datos de "Mi Resumen". Lee con la sesión del usuario (RLS), nunca con tokens
 * de Slack: todo sale de la caché que mantienen events/sync/interactivity.
 */
export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const [tasksRes, linksRes, readsRes, pinnedRes] = await Promise.all([
    supabase
      .from('slack_tasks')
      .select('id, slack_channel_id, text, created_by_name, priority, is_completed, created_at, permalink')
      .eq('assignee_profile_id', user.id)
      .eq('is_completed', false)
      .order('created_at', { ascending: false }),
    supabase
      .from('slack_channel_links')
      .select('slack_channel_id, team_id, name, kind, company_id, last_message_at, company:companies(name)')
      .eq('is_archived', false),
    supabase.from('slack_channel_reads').select('slack_channel_id, last_seen_at').eq('profile_id', user.id),
    supabase
      .from('slack_messages')
      .select('slack_channel_id, text, posted_at, permalink, pinned_at')
      .eq('is_pinned', true)
      .order('pinned_at', { ascending: false })
      .limit(PINNED_LIMIT),
  ]);

  const links = linksRes.data || [];
  const linkById = new Map(links.map((l) => [l.slack_channel_id, l]));
  const companyName = (l: (typeof links)[number] | undefined): string | null => {
    const company = l?.company as { name: string } | { name: string }[] | null | undefined;
    if (!company) return null;
    return Array.isArray(company) ? company[0]?.name ?? null : company.name;
  };
  const lastSeen = new Map((readsRes.data || []).map((r) => [r.slack_channel_id, r.last_seen_at]));
  const defaultSince = new Date(Date.now() - NO_VISIT_WINDOW_DAYS * 86400 * 1000).toISOString();

  const clientLinks = links.filter((l) => l.kind === 'client');
  const unreadCounts = await Promise.all(
    clientLinks.map(async (l) => {
      const { count } = await supabase
        .from('slack_messages')
        .select('ts', { count: 'exact', head: true })
        .eq('slack_channel_id', l.slack_channel_id)
        .is('thread_ts', null)
        .gt('posted_at', lastSeen.get(l.slack_channel_id) || defaultSince);
      return count || 0;
    })
  );

  const summary: SlackSummary = {
    tasks: (tasksRes.data || []).map((t) => {
      const link = linkById.get(t.slack_channel_id);
      return {
        id: t.id,
        channel_id: t.slack_channel_id,
        channel_name: link?.name || '',
        company_name: companyName(link),
        content: t.text,
        sender_name: t.created_by_name,
        priority: t.priority,
        is_completed: t.is_completed,
        created_at: t.created_at,
        permalink: t.permalink,
      };
    }),
    clientChannels: clientLinks
      .map((l, i) => ({
        id: l.slack_channel_id,
        name: l.name,
        company_id: l.company_id,
        company_name: companyName(l),
        unread_count: unreadCounts[i],
        last_message_at: l.last_message_at,
        url: slackChannelUrl(l.team_id, l.slack_channel_id),
      }))
      .sort((a, b) => b.unread_count - a.unread_count || (b.last_message_at || '').localeCompare(a.last_message_at || '')),
    pinned: (pinnedRes.data || []).map((m) => ({
      channel_id: m.slack_channel_id,
      channel_name: linkById.get(m.slack_channel_id)?.name || '',
      content: m.text,
      created_at: m.pinned_at || m.posted_at,
      permalink: m.permalink,
    })),
  };

  return NextResponse.json(summary);
}
