import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getSlackConfig, SLACK_BOT_SCOPES, SLACK_OAUTH_STATE_COOKIE } from '@/lib/slack/config';
import { getHubUser, isCoordinatorRole } from '@/lib/slack/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Inicio del OAuth v2: solo coordinador/admin puede conectar el workspace. */
export async function GET() {
  const user = await getHubUser();
  if (!user || !isCoordinatorRole(user.role)) {
    return NextResponse.json({ error: 'Solo un coordinador puede conectar Slack' }, { status: 403 });
  }

  const { clientId, redirectUri } = getSlackConfig();
  const state = randomBytes(16).toString('hex');

  const url = new URL('https://slack.com/oauth/v2/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('scope', SLACK_BOT_SCOPES.join(','));
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);

  const res = NextResponse.redirect(url.toString());
  res.cookies.set(SLACK_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/slack/oauth',
    maxAge: 600,
  });
  return res;
}
