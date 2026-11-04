import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface AuthenticatedUserResult {
  user: { id: string; email?: string } | null;
  profile: { id: string; role: string; status: string; full_name?: string } | null;
  errorResponse: NextResponse | null;
}

/**
 * Validador de sesión y permisos para Route Handlers (API).
 * Bloquea accesos anónimos, usuarios suspendidos y cuentas pendientes de aprobación.
 */
export async function requireActiveUser(req?: NextRequest): Promise<AuthenticatedUserResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isMockEnv = !supabaseUrl || supabaseUrl.includes('your-project') || supabaseUrl.includes('tu-proyecto');

  // En entorno local sin Supabase configurado, permite continuar en modo desarrollo
  if (isMockEnv && process.env.NODE_ENV !== 'production') {
    return {
      user: { id: '00000000-0000-0000-0000-000000000001', email: 'demo@brainupgrup.com' },
      profile: { id: '00000000-0000-0000-0000-000000000001', role: 'admin', status: 'active', full_name: 'Demo Admin' },
      errorResponse: null,
    };
  }

  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        user: null,
        profile: null,
        errorResponse: NextResponse.json(
          { error: 'No autorizado. Se requiere iniciar sesión con una cuenta activa.' },
          { status: 401 }
        ),
      };
    }

    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('id, role, status, full_name')
      .eq('id', user.id)
      .single();

    if (profError || !profile) {
      return {
        user,
        profile: null,
        errorResponse: NextResponse.json(
          { error: 'Perfil de usuario no encontrado en el sistema.' },
          { status: 403 }
        ),
      };
    }

    if (profile.status !== 'active') {
      return {
        user,
        profile: null,
        errorResponse: NextResponse.json(
          { error: 'Tu cuenta está pendiente de validación o ha sido desactivada por la dirección.' },
          { status: 403 }
        ),
      };
    }

    return {
      user,
      profile,
      errorResponse: null,
    };
  } catch (err: any) {
    return {
      user: null,
      profile: null,
      errorResponse: NextResponse.json(
        { error: 'Error al verificar autenticación: ' + (err?.message || 'Error interno') },
        { status: 500 }
      ),
    };
  }
}

