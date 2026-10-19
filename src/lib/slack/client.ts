import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { decryptToken } from './crypto';

/**
 * Wrapper mínimo de la Web API de Slack con fetch (sin dependencias nuevas).
 * Envía form-urlencoded, que Slack acepta en todos los métodos; los objetos
 * (blocks, view) se serializan a JSON.
 */

export interface SlackApiResponse {
  ok: boolean;
  error?: string;
  response_metadata?: { next_cursor?: string };
  [key: string]: unknown;
}

export class SlackApiError extends Error {
  constructor(public method: string, public code: string) {
    super(`Slack ${method}: ${code}`);
  }
}

export async function slackApi<T extends SlackApiResponse = SlackApiResponse>(
  method: string,
  params: Record<string, unknown>,
  token?: string
): Promise<T> {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    body.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  }

  const res = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
    cache: 'no-store',
  });

  if (res.status === 429) {
    throw new SlackApiError(method, `ratelimited (retry-after ${res.headers.get('retry-after')}s)`);
  }

  const data = (await res.json()) as T;
  if (!data.ok) throw new SlackApiError(method, data.error || 'unknown_error');
  return data;
}

/** Recorre todas las páginas de un método paginado por cursor. */
export async function slackPaginate<T>(
  method: string,
  params: Record<string, unknown>,
  token: string,
  pick: (page: SlackApiResponse) => T[],
  maxPages = 10
): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const page = await slackApi(method, { ...params, cursor, limit: 200 }, token);
    items.push(...pick(page));
    cursor = page.response_metadata?.next_cursor || undefined;
    if (!cursor) break;
  }
  return items;
}

/** Devuelve team_id y token del bot descifrado (app de un único workspace). */
export async function getBotInstallation(teamId?: string): Promise<{ teamId: string; token: string } | null> {
  const supabase = createAdminSupabaseClient();
  let query = supabase.from('slack_installations').select('team_id, bot_token_encrypted').limit(1);
  if (teamId) query = query.eq('team_id', teamId);
  const { data } = await query.maybeSingle();
  if (!data) return null;
  return { teamId: data.team_id, token: decryptToken(data.bot_token_encrypted) };
}

/** Busca el perfil del Hub vinculado a un usuario de Slack; si no existe, intenta por email. */
export async function resolveProfileId(slackUserId: string, teamId: string, token: string): Promise<string | null> {
  const supabase = createAdminSupabaseClient();
  const { data: link } = await supabase
    .from('slack_user_links')
    .select('profile_id')
    .eq('slack_user_id', slackUserId)
    .maybeSingle();
  if (link) return link.profile_id;

  try {
    const info = await slackApi<SlackApiResponse & { user?: { profile?: { email?: string } } }>(
      'users.info',
      { user: slackUserId },
      token
    );
    const email = info.user?.profile?.email;
    if (!email) return null;

    const { data: profile } = await supabase.from('profiles').select('id').ilike('email', email).maybeSingle();
    if (!profile) return null;

    await supabase
      .from('slack_user_links')
      .upsert({ profile_id: profile.id, slack_user_id: slackUserId, team_id: teamId });
    return profile.id;
  } catch {
    return null;
  }
}
