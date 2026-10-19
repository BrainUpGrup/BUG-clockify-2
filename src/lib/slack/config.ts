/**
 * Configuración de la integración con Slack (solo servidor).
 * Ver docs/INTEGRACION_SLACK.md
 */

export const SLACK_BOT_SCOPES = [
  'channels:read',
  'groups:read',
  'channels:history',
  'groups:history',
  'pins:read',
  'reactions:read',
  'users:read',
  'users:read.email',
  'chat:write',
  'commands',
] as const;

export const SLACK_TASK_SHORTCUT_ID = 'bu_convert_to_task';
export const SLACK_TASK_MODAL_ID = 'bu_task_modal';
export const SLACK_OAUTH_STATE_COOKIE = 'bu_slack_oauth_state';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name} (ver .env.example)`);
  }
  return value;
}

export function getSlackConfig() {
  return {
    clientId: required('SLACK_CLIENT_ID'),
    clientSecret: required('SLACK_CLIENT_SECRET'),
    signingSecret: required('SLACK_SIGNING_SECRET'),
    redirectUri: `${required('SLACK_REDIRECT_BASE_URL')}/api/slack/oauth/callback`,
  };
}

export function isSlackConfigured(): boolean {
  return Boolean(
    process.env.SLACK_CLIENT_ID &&
      process.env.SLACK_CLIENT_SECRET &&
      process.env.SLACK_SIGNING_SECRET &&
      process.env.SLACK_TOKEN_ENCRYPTION_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/** Convierte un ts de Slack ("1712345678.000200") a ISO. */
export function slackTsToIso(ts: string): string {
  return new Date(Math.floor(parseFloat(ts) * 1000)).toISOString();
}

/** Enlace para abrir un canal en Slack (web; el navegador ofrece abrir la app). */
export function slackChannelUrl(teamId: string, channelId: string): string {
  return `https://app.slack.com/client/${teamId}/${channelId}`;
}
