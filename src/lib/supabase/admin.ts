import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase con service role. SOLO para Route Handlers del servidor
 * (integración Slack). Salta RLS: nunca importar desde componentes cliente.
 */
export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (ver .env.example)');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
