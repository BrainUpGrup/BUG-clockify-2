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
  const entry = getTempPasswordForEmail(cleanEmail);

  // Si existe entrada y password_configured es false, requerir reseteo
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

      // Guardar en almacenamiento persistente
      setTempPasswordForUser(targetUserId, cleanEmail, tempPass);

      // Intentar actualizar también en la base de datos Supabase si la columna existe
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
      const candidatePass = body.password || '';
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

    // 2. ACCIÓN: USUARIO CONFIGURA SU CONTRASEÑA DEFINITIVA (Pone password_configured = true)
    if (action === 'update_password') {
      if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
        return NextResponse.json(
          { error: 'La nueva contraseña debe tener al menos 6 caracteres' },
          { status: 400 }
        );
      }

      // Marcar como configurada en almacenamiento persistente
      markPasswordConfigured(cleanEmail);

      // Intentar actualizar en Supabase profiles si la columna existe
      if (supabase) {
        try {
          await supabase
            .from('profiles')
            .update({
              password_configured: true,
              temp_password: null,
            })
            .eq('email', cleanEmail);
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
