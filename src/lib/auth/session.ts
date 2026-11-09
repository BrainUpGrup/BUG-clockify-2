/**
 * Utilidad criptográfica de sesión basada en Web Crypto API (HMAC-SHA256).
 * Compatible con Edge Runtime (Next.js Middleware), Node.js (Route Handlers) y Browser.
 */

export interface SessionPayload {
  id: string;
  email: string;
  role: 'admin' | 'coordinator' | 'employee';
  status: 'active' | 'pending' | 'rejected';
  department?: string;
  exp: number; // Expiración en ms
}

export const SESSION_COOKIE_NAME = 'bug_clockify_session';

// Helpers para base64url compatibles al 100% con Edge Runtime, Node.js y Browser
function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToUint8Array(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function stringToBase64Url(str: string): string {
  const enc = new TextEncoder();
  return uint8ArrayToBase64Url(enc.encode(str));
}

function base64UrlToString(base64url: string): string {
  const dec = new TextDecoder();
  return dec.decode(base64UrlToUint8Array(base64url));
}

function getSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim() !== '') {
    return process.env.SESSION_SECRET.trim();
  }
  const fallbackSource =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'brainup-clockify-default-secret-salt-2026';
  return `bug_salt_${fallbackSource}`;
}

async function getHmacKey(usage: 'sign' | 'verify'): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const secret = getSessionSecret();
  return globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage]
  );
}

export async function signSessionToken(
  payload: Omit<SessionPayload, 'exp'>,
  ttlSeconds = 60 * 60 * 24 * 7 // 7 días por defecto
): Promise<string> {
  const enc = new TextEncoder();
  const key = await getHmacKey('sign');
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Date.now() + ttlSeconds * 1000,
  };

  const payloadB64 = stringToBase64Url(JSON.stringify(fullPayload));
  const signatureBuffer = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(payloadB64));
  const signatureB64 = uint8ArrayToBase64Url(new Uint8Array(signatureBuffer));

  return `${payloadB64}.${signatureB64}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signatureB64] = parts;
  if (!payloadB64 || !signatureB64) return null;

  try {
    const enc = new TextEncoder();
    const key = await getHmacKey('verify');
    const signatureBytes = base64UrlToUint8Array(signatureB64);

    const isValid = await globalThis.crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes as unknown as BufferSource,
      enc.encode(payloadB64)
    );

    if (!isValid) return null;

    const jsonStr = base64UrlToString(payloadB64);
    const payload = JSON.parse(jsonStr) as SessionPayload;

    if (!payload || !payload.id || !payload.email || !payload.role) {
      return null;
    }

    if (payload.exp && Date.now() > payload.exp) {
      return null; // Token expirado
    }

    return payload;
  } catch {
    return null;
  }
}
