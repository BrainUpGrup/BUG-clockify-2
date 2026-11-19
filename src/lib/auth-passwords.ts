import fs from 'fs';
import path from 'path';

export interface TempPasswordEntry {
  userId: string;
  email: string;
  tempPassword: string;
  password_configured: boolean;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'temp-passwords.json');

/**
 * En producción (Vercel) o cuando Supabase está configurado, NO se lee ni escribe
 * `data/temp-passwords.json` en disco; toda la gestión de claves temporales depende
 * al 100% de la bóveda segura de Supabase (`profile_passwords` + RPCs SECURITY DEFINER).
 */
export function isLocalTempPasswordFallbackAllowed(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const hasSupabase =
    Boolean(supabaseUrl) &&
    !supabaseUrl.includes('your-project') &&
    !supabaseUrl.includes('tu-proyecto');
  return !hasSupabase;
}

function ensureDataFile(): boolean {
  if (!isLocalTempPasswordFallbackAllowed()) return false;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2), 'utf-8');
    }
    return true;
  } catch (err) {
    console.error('Error initializing temp-passwords file:', err);
    return false;
  }
}

export function getAllTempPasswords(): Record<string, TempPasswordEntry> {
  if (!ensureDataFile()) return {};
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function getTempPasswordForEmail(email: string): TempPasswordEntry | null {
  if (!isLocalTempPasswordFallbackAllowed()) return null;
  const all = getAllTempPasswords();
  return all[email.trim().toLowerCase()] || null;
}

export function verifyTempPassword(email: string, candidatePassword: string): boolean {
  if (!isLocalTempPasswordFallbackAllowed()) return false;
  const entry = getTempPasswordForEmail(email);
  if (!entry) return false;
  if (entry.password_configured === false && entry.tempPassword && entry.tempPassword === candidatePassword.trim()) {
    return true;
  }
  return false;
}

export function setTempPasswordForUser(
  userId: string,
  email: string,
  tempPassword: string
): TempPasswordEntry | null {
  if (!ensureDataFile()) return null;
  const all = getAllTempPasswords();
  const cleanEmail = email.trim().toLowerCase();

  const entry: TempPasswordEntry = {
    userId,
    email: cleanEmail,
    tempPassword,
    password_configured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  all[cleanEmail] = entry;

  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(all, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing temp-passwords file:', err);
  }

  return entry;
}

export function markPasswordConfigured(email: string): boolean {
  if (!ensureDataFile()) return false;
  const all = getAllTempPasswords();
  const cleanEmail = email.trim().toLowerCase();

  if (all[cleanEmail]) {
    all[cleanEmail].password_configured = true;
    all[cleanEmail].tempPassword = '';
    all[cleanEmail].updatedAt = new Date().toISOString();
  } else {
    all[cleanEmail] = {
      userId: '',
      email: cleanEmail,
      tempPassword: '',
      password_configured: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(all, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing temp-passwords file:', err);
    return false;
  }
}
