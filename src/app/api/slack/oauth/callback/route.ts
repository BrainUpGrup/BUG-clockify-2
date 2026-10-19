import { NextRequest, NextResponse } from 'next/server';
import { getSlackConfig, SLACK_OAUTH_STATE_COOKIE } from '@/lib/slack/config';
import { slackApi, SlackApiResponse } from '@/lib/slack/client';
import { encryptToken } from '@/lib/slack/crypto';
import { getHubUser, isCoordinatorRole } from '@/lib/slack/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface OAuthV2AccessResponse extends SlackApiResponse {
  access_token: string;
  scope: string;
  bot_user_id: string;
  team: { id: string; name: string };
}

export async function GET(req: NextRequest) {
  const back = (status: string) => {
    const res = NextResponse.redirect(new URL(`/dashboard/coordinator?slack=${status}`, req.url));
    res.cookies.delete(SLACK_OAUTH_STATE_COOKIE);
    return res;
  };

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const expectedState = req.cookies.get(SLACK_OAUTH_STATE_COOKIE)?.value;

  if (req.nextUrl.searchParams.get('error')) return back('cancelled');
  if (!code || !state || !expectedState || state !== expectedState) return back('invalid_state');

  const user = await getHubUser();
  if (!user || !isCoordinatorRole(user.role)) return back('forbidden');

  const { clientId, clientSecret, redirectUri } = getSlackConfig();

  try {
    const data = await slackApi<OAuthV2AccessResponse>('oauth.v2.access', {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.from('slack_installations').upsert({
      team_id: data.team.id,
      team_name: data.team.name,
      bot_user_id: data.bot_user_id,
      bot_token_encrypted: encryptToken(data.access_token),
      scopes: data.scope,
      installed_by: user.id,
      installed_at: new Date().toISOString(),
    });
    if (error) return back('db_error');

    return back('connected');
  } catch {
    return back('oauth_error');
  }
}
