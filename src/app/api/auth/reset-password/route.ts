import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { 
  getTempPasswordForEmail, 
  setTempPasswordForUser, 
  markPasswordConfigured,
  verifyTempPassword
} from '@/lib/auth-passwords';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}

/**
 * Resuelve la identidad y rol del usuario que realiza la petición,
 * contrastando la sesión o cookie contra la base de datos Supabase en tiempo real.
 */
async function resolveCaller(req: NextRequest): Promise<{ id: string; email: string; role: string; status: string } | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  // 1. Prioridad: Sesión criptográfica de Supabase Auth
  try {
    const serverSupabase = createServerSupabaseClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (user && user.id) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, email, role, status')
        .eq('id', user.id)
        .maybeSingle();
      if (prof && prof.status === 'active') {
        return prof;
      }
    }
  } catch {
    // Continuar con verificación de cookie
  }

  // 2. Cookie de sesión criptográfica firmada con HMAC-SHA256
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionCookie) {
    const verified = await verifySessionToken(sessionCookie);
    if (verified && verified.status === 'active') {
      return {
        id: verified.id,
        email: verified.email,
        role: verified.role,
        status: verified.status,
      };
    }
  }

  return null;
}

function generateReadableOTP(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BU-${code}-2026`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Falta el parámetro email' }, { status: 400 });
  }

  const cleanEmail = email.trim().toLowerCase();
  const caller = await resolveCaller(req);

  // Control de privacidad: solo el propio usuario o coordinación/administración pueden consultar el estado de reinicio
  const isAuthorized = caller && (
    caller.email.toLowerCase() === cleanEmail || 
    caller.role === 'admin' || 
    caller.role === 'coordinator'
  );

  if (!isAuthorized) {
    return NextResponse.json({
      email: cleanEmail,
      password_configured: true,
      has_temp_password: false,
    });
  }

  const supabase = getSupabaseClient();

  // 1. Prioridad: Consultar directamente en Supabase profiles
  if (supabase) {
    try {
      const { data: dbProf } = await supabase
        .from('profiles')
        .select('password_configured, temp_password')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (dbProf) {
        if (dbProf.password_configured === false) {
          return NextResponse.json({
            email: cleanEmail,
            password_configured: false,
            has_temp_password: !!dbProf.temp_password,
          });
        }
        if (dbProf.password_configured === true) {
          return NextResponse.json({
            email: cleanEmail,
            password_configured: true,
            has_temp_password: false,
          });
        }
      }
    } catch {
      // fallback
    }
  }

  // 2. Fallback: Almacenamiento local temporal en desarrollo
  const entry = getTempPasswordForEmail(cleanEmail);
  const passwordConfigured = entry ? entry.password_configured : true;

  return NextResponse.json({
    email: cleanEmail,
    password_configured: passwordConfigured,
    has_temp_password: !!entry?.tempPassword,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, userId, newPassword } = body;

    if (!email) {
      return NextResponse.json({ error: 'El correo electrónico es obligatorio' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const supabase = getSupabaseClient();

    // 1. ACCIÓN: RESET DE SUPER ADMIN (Requiere rol admin o coordinator)
    if (action === 'admin_reset') {
      const caller = await resolveCaller(req);
      if (!caller || (caller.role !== 'admin' && caller.role !== 'coordinator')) {
        return NextResponse.json(
          { error: 'No autorizado. Se requieren permisos de administrador o coordinador para generar claves temporales.' },
          { status: 403 }
        );
      }

      const tempPass = generateReadableOTP();
      const targetUserId = userId || '';

      // Guardar en almacenamiento persistente local
      setTempPasswordForUser(targetUserId, cleanEmail, tempPass);

      // Actualizar en la base de datos Supabase
      if (supabase) {
        try {
          await supabase
            .from('profiles')
            .update({
              password_configured: false,
              temp_password: tempPass,
            })
            .eq('email', cleanEmail);
        } catch (dbErr) {
          console.warn('Aviso: Columna password_configured pendiente en Supabase PostgreSQL:', dbErr);
        }
      }

      return NextResponse.json({
        success: true,
        email: cleanEmail,
        tempPassword: tempPass,
        password_configured: false,
        message: 'Contraseña de un solo uso generada correctamente.',
      });
    }

    // 2. ACCIÓN: VERIFICAR CONTRASEÑA TEMPORAL AL INICIAR SESIÓN (Durante login)
    if (action === 'verify_temp_password') {
      const candidatePass = (body.password || '').trim();

      if (!candidatePass) {
        return NextResponse.json({ valid: false, error: 'La contraseña es requerida.' }, { status: 400 });
      }

      // Primero consultar en Supabase
      if (supabase) {
        try {
          const { data: dbProf } = await supabase
            .from('profiles')
            .select('password_configured, temp_password')
            .eq('email', cleanEmail)
            .maybeSingle();

          if (
            dbProf &&
            dbProf.password_configured === false &&
            dbProf.temp_password &&
            dbProf.temp_password.trim() === candidatePass
          ) {
            return NextResponse.json({
              valid: true,
              email: cleanEmail,
              password_configured: false,
            });
          }
        } catch {
          // fallback
        }
      }

      // Fallback a almacenamiento temporal
      const isValid = verifyTempPassword(cleanEmail, candidatePass);

      if (isValid) {
        return NextResponse.json({
          valid: true,
          email: cleanEmail,
          password_configured: false,
        });
      }

      return NextResponse.json({
        valid: false,
        error: 'Contraseña temporal no válida o ya utilizada.',
      }, { status: 401 });
    }

    // 3. ACCIÓN: CONFIGURAR CONTRASEÑA DEFINITIVA
    // Control estricto: Solo el propio usuario autenticado o un administrador/coordinador
    if (action === 'update_password') {
      if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
        return NextResponse.json(
          { error: 'La nueva contraseña debe tener al menos 6 caracteres' },
          { status: 400 }
        );
      }

      const caller = await resolveCaller(req);
      const isSelf = caller && caller.email.toLowerCase() === cleanEmail;
      const isManager = caller && (caller.role === 'admin' || caller.role === 'coordinator');

      if (!caller || (!isSelf && !isManager)) {
        return NextResponse.json(
          { error: 'No autorizado. Solo puedes actualizar tu propia contraseña o requerir autorización de coordinación.' },
          { status: 403 }
        );
      }

      const cleanNewPassword = newPassword.trim();

      // Marcar como configurada en almacenamiento persistente local
      markPasswordConfigured(cleanEmail);

      // Actualizar en Supabase profiles
      if (supabase) {
        try {
          const { error: fullUpdateErr } = await supabase
            .from('profiles')
            .update({
              password_configured: true,
              temp_password: null,
              custom_password: cleanNewPassword,
            })
            .eq('email', cleanEmail);

          if (fullUpdateErr) {
            await supabase
              .from('profiles')
              .update({
                password_configured: true,
                temp_password: null,
              })
              .eq('email', cleanEmail);
          }
        } catch (dbErr) {
          console.warn('Aviso: Actualización en Supabase profiles:', dbErr);
        }
      }

      return NextResponse.json({
        success: true,
        email: cleanEmail,
        password_configured: true,
        message: 'Contraseña actualizada correctamente.',
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error interno del servidor';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
