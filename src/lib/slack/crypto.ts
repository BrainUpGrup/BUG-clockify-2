import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Cifrado AES-256-GCM de tokens de Slack antes de guardarlos en Supabase.
 * Formato almacenado: base64(iv).base64(authTag).base64(ciphertext)
 */

function getKey(): Buffer {
  const raw = process.env.SLACK_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error('Falta SLACK_TOKEN_ENCRYPTION_KEY (ver .env.example)');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('SLACK_TOKEN_ENCRYPTION_KEY debe ser de 32 bytes en base64');
  return key;
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((b) => b.toString('base64')).join('.');
}

export function decryptToken(stored: string): string {
  const [iv, tag, encrypted] = stored.split('.').map((part) => Buffer.from(part, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
