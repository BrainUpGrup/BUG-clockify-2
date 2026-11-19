import { NextRequest, NextResponse } from 'next/server';
import { requireActiveUser, isManagerRole, type AuthenticatedUserResult } from '@/lib/api-auth';
import { createDataSupabaseClient } from '@/lib/supabase/server';
import { BRAIN_UP_HUB_APPS, DEFAULT_EMPLOYEE_APPS } from '@/lib/hub-apps';

const VALID_APP_IDS = new Set(BRAIN_UP_HUB_APPS.map((a) => a.id));

export function sanitizeAppIdList(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const filtered = Array.from(
    new Set(
      input
        .map((item) => String(item || '').trim())
        .filter((id) => VALID_APP_IDS.has(id))
    )
  );
  return filtered;
}

/**
 * Resuelve en el servidor las aplicaciones del Hub autorizadas para un usuario.
 * - Admin / Coordinator: acceso completo garantizado por gobernanza.
 * - Employee: consulta `public.user_hub_preferences.allowed_apps` en Supabase
 *   (fallback seguro a `DEFAULT_EMPLOYEE_APPS` si aún no tiene fila o tabla).
 */
export async function getEffectiveAllowedAppsForUser(
  userId: string,
  role: string
): Promise<string[]> {
  if (isManagerRole(role)) {
    return BRAIN_UP_HUB_APPS.map((a) => a.id);
  }

  const supabase = createDataSupabaseClient();
  if (!supabase || !userId) {
    return [...DEFAULT_EMPLOYEE_APPS];
  }

  try {
    const { data, error } = await supabase
      .from('user_hub_preferences')
      .select('allowed_apps')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return [...DEFAULT_EMPLOYEE_APPS];
    }

    const sanitized = sanitizeAppIdList(data?.allowed_apps);
    if (sanitized && sanitized.length > 0) {
      return sanitized;
    }
  } catch {
    // Fallback sin caídas si la tabla aún no fue migrada
  }

  return [...DEFAULT_EMPLOYEE_APPS];
}

/**
 * Guard de servidor: exige usuario activo y permiso real sobre el módulo del Hub indicado.
 */
export async function requireHubAppAccess(
  req: NextRequest,
  appId: string
): Promise<AuthenticatedUserResult> {
  const auth = await requireActiveUser(req);
  if (auth.errorResponse || !auth.profile) {
    return auth;
  }

  if (isManagerRole(auth.profile.role)) {
    return auth;
  }

  const allowedApps = await getEffectiveAllowedAppsForUser(auth.profile.id, auth.profile.role);
  if (!allowedApps.includes(appId)) {
    return {
      user: auth.user,
      profile: auth.profile,
      errorResponse: NextResponse.json(
        {
          error: 'No tienes permiso asignado para acceder a esta herramienta del Hub. Consulta con coordinación.',
          code: 'HUB_APP_FORBIDDEN',
          appId,
        },
        { status: 403 }
      ),
    };
  }

  return auth;
}
