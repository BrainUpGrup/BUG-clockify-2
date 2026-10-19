import { createHmac, timingSafeEqual } from 'crypto';

const MAX_AGE_SECONDS = 60 * 5;

/**
 * Verifica que una petición entrante procede de Slack.
 * https://api.slack.com/authentication/verifying-requests-from-slack
 * Debe recibir el cuerpo en bruto (req.text()), antes de parsearlo.
 */
export function verifySlackSignature(
  signingSecret: string,
  rawBody: string,
  timestampHeader: string | null,
  signatureHeader: string | null
): boolean {
  if (!timestampHeader || !signatureHeader) return false;

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > MAX_AGE_SECONDS) return false;

  const expected =
    'v0=' + createHmac('sha256', signingSecret).update(`v0:${timestamp}:${rawBody}`).digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signatureHeader, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
