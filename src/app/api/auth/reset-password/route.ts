import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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
  const supabase = getSupabaseClient();

  // 1. Prioridad: Consultar directamente en Supabase profiles (verdad única)
  if (supabase) {
    try {
      const { data: dbProf } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (dbProf) {
        // Si la columna password_configured existe en Supabase y es explícitamente false
        if (dbProf.password_configured === false) {
          return NextResponse.json({
            email: cleanEmail,
            password_configured: false,
            has_temp_password: !!dbProf.temp_password,
          });
        }
        // Si la columna existe y es true, o no está marcada como false
        if (dbProf.password_configured === true) {
          return NextResponse.json({
            email: cleanEmail,
            password_configured: true,
            has_temp_password: false,
          });
        }
      }
    } catch {
      // Ignorar error si la columna aún no está en Supabase
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

    // 1. ACCIÓN: RESET DE SUPER ADMIN (Generar clave de un solo uso y poner password_configured = false)
    if (action === 'admin_reset') {
      const tempPass = generateReadableOTP();
      const targetUserId = userId || '';

      // Guardar en almacenamiento persistente local
      setTempPasswordForUser(targetUserId, cleanEmail, tempPass);

      // Actualizar también en la base de datos Supabase
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

    // 2. ACCIÓN: VERIFICAR CONTRASEÑA TEMPORAL AL INICIAR SESIÓN
    if (action === 'verify_temp_password') {
      const candidatePass = (body.password || '').trim();

      // Primero consultar en Supabase
      if (supabase) {
        try {
          const { data: dbProf } = await supabase
            .from('profiles')
            .select('*')
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

    // 3. ACCIÓN: USUARIO CONFIGURA SU CONTRASEÑA DEFINITIVA (Pone password_configured = true)
    if (action === 'update_password') {
      if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
        return NextResponse.json(
          { error: 'La nueva contraseña debe tener al menos 6 caracteres' },
          { status: 400 }
        );
      }

      const cleanNewPassword = newPassword.trim();

      // Marcar como configurada en almacenamiento persistente local
      markPasswordConfigured(cleanEmail);

      // Actualizar en Supabase profiles
      if (supabase) {
        try {
          // Intentar guardar con custom_password para login inmediato
          const { error: fullUpdateErr } = await supabase
            .from('profiles')
            .update({
              password_configured: true,
              temp_password: null,
              custom_password: cleanNewPassword,
            })
            .eq('email', cleanEmail);

          if (fullUpdateErr) {
            // Si la columna custom_password no existe aún, actualizar solo password_configured
            await supabase
              .from('profiles')
              .update({
                password_configured: true,
                temp_password: null,
              })
              .eq('email', cleanEmail);
          }
        } catch (dbErr) {
          console.warn('Aviso: Columna password_configured pendiente en Supabase profiles:', dbErr);
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
