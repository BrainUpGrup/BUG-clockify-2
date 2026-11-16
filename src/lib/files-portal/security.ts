/**
 * Módulo de seguridad Zero-Trust para el Área Trabajador y Área Cliente de IaiaHub.
 * Incluye:
 *  - Validación estricta de tipos MIME / extensiones (bloqueo de ejecutables y scripts XSS)
 *  - Sanitización anti path-traversal de nombres de archivo y carpetas
 *  - Generación de tokens y verificación HMAC-SHA256 para sesiones aisladas de Portal Cliente
 *  - Hashing y verificación segura de PIN (4-6 dígitos)
 */

import { ClientPortalSessionPayload } from '@/types/files-portal';

export const CLIENT_PORTAL_COOKIE_NAME = 'bug_client_portal_session';

export const MAX_UPLOAD_SIZE_BYTES = 150 * 1024 * 1024; // 150 MB

const BLOCKED_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'com', 'msi', 'scr', 'pif', 'application',
  'sh', 'bash', 'zsh', 'ps1', 'psm1', 'vbs', 'vbe', 'jse',
  'js', 'mjs', 'cjs', 'ts', 'jsx', 'tsx',
  'php', 'phtml', 'phar', 'asp', 'aspx', 'jsp', 'jspx',
  'html', 'htm', 'xhtml', 'shtml',
  'dll', 'so', 'dylib', 'jar', 'war',
]);

const ALLOWED_EXTENSIONS = new Set([
  // Imagenes y graficos
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'tiff', 'tif', 'bmp', 'ico', 'svg',
  // Video y audio
  'mp4', 'mov', 'webm', 'm4v', 'avi', 'mkv', 'mp3', 'wav', 'm4a', 'aac', 'ogg',
  // Documentos e informes
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp',
  'txt', 'csv', 'rtf', 'md', 'json',
  // Diseno y empaquetado de agencia
  'psd', 'ai', 'eps', 'indd', 'fig', 'sketch', 'xd', 'afdesign', 'afphoto',
  'zip', 'rar', '7z',
]);

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName: string;
  extension: string;
}

/**
 * Sanitiza un nombre de archivo o carpeta eliminando secuencias de traversal y caracteres inválidos.
 */
export function sanitizeStorageName(input: string, fallback = 'archivo'): string {
  const cleaned = (input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
    .replace(/\.{2,}/g, '_')
    .trim();

  return cleaned.length > 0 ? cleaned.slice(0, 140) : fallback;
}

/**
 * Sanitiza un segmento de carpeta por empresa (slug legible para Google Drive y Simulador).
 */
export function buildCompanyDriveSlug(companyId: string, companyName?: string): string {
  const safeName = sanitizeStorageName(companyName || 'empresa', 'empresa')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 48);
  const shortId = sanitizeStorageName(companyId, 'id').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 8);
  return `${safeName || 'empresa'}_${shortId || 'local'}`;
}

/**
 * Valida extensión, tamaño y seguridad del archivo subido.
 */
export function validateUploadedFile(
  fileName: string,
  mimeType: string,
  sizeBytes: number
): FileValidationResult {
  const sanitizedName = sanitizeStorageName(fileName, 'entregable');
  const dotIdx = sanitizedName.lastIndexOf('.');
  const extension = dotIdx >= 0 ? sanitizedName.slice(dotIdx + 1).toLowerCase() : '';

  if (!extension || BLOCKED_EXTENSIONS.has(extension)) {
    return {
      valid: false,
      error: `Formato no permitido por política de seguridad (.${extension || 'desconocido'}).`,
      sanitizedName,
      extension,
    };
  }

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return {
      valid: false,
      error: `La extensión .${extension} no está dentro de los formatos autorizados de agencia.`,
      sanitizedName,
      extension,
    };
  }

  if (sizeBytes <= 0) {
    return {
      valid: false,
      error: 'El archivo está vacío (0 bytes).',
      sanitizedName,
      extension,
    };
  }

  if (sizeBytes > MAX_UPLOAD_SIZE_BYTES) {
    return {
      valid: false,
      error: 'El archivo supera el límite máximo permitido de 150 MB.',
      sanitizedName,
      extension,
    };
  }

  // Bloqueo preventivo de SVG con MIME peligroso o HTML camuflado
  const lowerMime = (mimeType || '').toLowerCase();
  if (lowerMime.includes('text/html') || lowerMime.includes('javascript')) {
    return {
      valid: false,
      error: 'Tipo MIME bloqueado por seguridad.',
      sanitizedName,
      extension,
    };
  }

  return {
    valid: true,
    sanitizedName,
    extension,
  };
}

/**
 * Genera un token aleatorio criptográfico para el enlace único de empresa (64 hex chars).
 */
export function generatePortalToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Valida formato de PIN numérico de 4 a 6 dígitos.
 */
export function isValidPinFormat(pin: string): boolean {
  return /^\d{4,6}$/.test((pin || '').trim());
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await globalThis.crypto.subtle.digest('SHA-256', enc.encode(input));
  return bytesToHex(new Uint8Array(digest));
}

/**
 * Genera un hash con sal aleatoria para almacenar PINs sin texto plano.
 */
export async function hashPortalPin(pin: string): Promise<string> {
  const saltBytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(saltBytes);
  const salt = bytesToHex(saltBytes);
  const hash = await sha256Hex(`${salt}:${pin.trim()}`);
  return `${salt}:${hash}`;
}

/**
 * Verifica un PIN contra su hash salado en tiempo constante.
 */
export async function verifyPortalPin(pin: string, storedHash: string): Promise<boolean> {
  if (!pin || !storedHash || !storedHash.includes(':')) return false;
  const [salt, expectedHex] = storedHash.split(':');
  if (!salt || !expectedHex) return false;

  const actualHex = await sha256Hex(`${salt}:${pin.trim()}`);
  if (actualHex.length !== expectedHex.length) return false;

  let diff = 0;
  for (let i = 0; i < actualHex.length; i++) {
    diff |= actualHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  return diff === 0;
}

// ------------------------------------------------------------------------------
// SESIÓN FIRMADA HMAC-SHA256 EXCLUSIVA PARA PORTAL CLIENTE
// ------------------------------------------------------------------------------

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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

function getPortalSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim() !== '') {
    return `client_portal:${process.env.SESSION_SECRET.trim()}`;
  }
  return 'client_portal:brainup-grup-hmac-sha256-isolated-portal-2026';
}

async function getPortalHmacKey(usage: 'sign' | 'verify'): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(getPortalSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage]
  );
}

/**
 * Firma una cookie de sesión aislada para un cliente autenticado por PIN.
 * Duración por defecto: 12 horas.
 */
export async function signClientPortalSession(
  payload: Omit<ClientPortalSessionPayload, 'exp' | 'scope'>,
  ttlSeconds = 60 * 60 * 12
): Promise<string> {
  const enc = new TextEncoder();
  const key = await getPortalHmacKey('sign');
  const fullPayload: ClientPortalSessionPayload = {
    scope: 'client_portal',
    ...payload,
    exp: Date.now() + ttlSeconds * 1000,
  };

  const payloadB64 = uint8ArrayToBase64Url(enc.encode(JSON.stringify(fullPayload)));
  const sigBuf = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(payloadB64));
  const sigB64 = uint8ArrayToBase64Url(new Uint8Array(sigBuf));
  return `${payloadB64}.${sigB64}`;
}

/**
 * Verifica y decodifica la cookie del Portal Cliente.
 */
export async function verifyClientPortalSession(
  token: string | undefined | null
): Promise<ClientPortalSessionPayload | null> {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;

  try {
    const enc = new TextEncoder();
    const key = await getPortalHmacKey('verify');
    const sigBytes = base64UrlToUint8Array(sigB64);
    const sigArrayBuffer = sigBytes.buffer.slice(
      sigBytes.byteOffset,
      sigBytes.byteOffset + sigBytes.byteLength
    ) as ArrayBuffer;

    const valid = await globalThis.crypto.subtle.verify(
      'HMAC',
      key,
      sigArrayBuffer,
      enc.encode(payloadB64)
    );
    if (!valid) return null;

    const dec = new TextDecoder();
    const parsed = JSON.parse(dec.decode(base64UrlToUint8Array(payloadB64))) as ClientPortalSessionPayload;
    if (!parsed || parsed.scope !== 'client_portal' || !parsed.companyId || !parsed.exp) {
      return null;
    }
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

