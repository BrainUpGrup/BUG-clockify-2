import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

const VALID_INVITE_CODES = new Set(['brainup', 'brainupgrup']);

function getAnonSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * POST /api/auth/register
 * Crea una solicitud de registro SIEMPRE en estado 'pending' y rol 'employee',
 * sin iniciar sesión automática ni delegar al trigger público de supabase.auth.signUp().
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fullName = String(body?.fullName || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '').trim();
    const department = String(body?.department || 'Creatividad & Operaciones').trim();
    const inviteToken = String(body?.inviteToken || '').trim().toLowerCase();

    if (!VALID_INVITE_CODES.has(inviteToken)) {
      return NextResponse.json(
        { error: 'Se requiere un enlace oficial de invitación válido de coordinación.' },
        { status: 403 }
      );
    }

    if (!fullName || !email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Nombre completo y correo electrónico válido son obligatorios.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }

    const adminClient = createAdminSupabaseClient();
    const supabase = adminClient ?? getAnonSupabaseClient();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Servicio de base de datos no configurado en el servidor.' },
        { status: 503 }
      );
    }

    // 1. Verificar que no exista un perfil previo con ese correo
    const { data: existingProf, error: lookupErr } = await supabase
      .from('profiles')
      .select('id, status')
      .eq('email', email)
      .maybeSingle();

    if (lookupErr) {
      return NextResponse.json(
        { error: 'No se pudo comprobar el correo en la base de datos.' },
        { status: 500 }
      );
    }

    if (existingProf) {
      if (existingProf.status === 'pending') {
        return NextResponse.json(
          { error: 'Ya existe una solicitud pendiente con este correo. La coordinadora la validará en breve.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Este correo ya está registrado en la plataforma. Puedes iniciar sesión directamente.' },
        { status: 409 }
      );
    }

    // 2. Insertar perfil STRICTAMENTE como 'employee' y 'pending'
    const { data: inserted, error: insertErr } = await supabase
      .from('profiles')
      .insert({
        full_name: fullName,
        email,
        role: 'employee',
        status: 'pending',
        department,
        password_configured: true,
      })
      .select('id, status')
      .single();

    if (insertErr || !inserted) {
      console.error('[Register API] Error insertando perfil pendiente:', insertErr);
      if (insertErr?.code === '23505') {
        return NextResponse.json(
          { error: 'Este correo ya tiene un registro en la base de datos.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: insertErr?.message || 'No se pudo registrar la solicitud de acceso.' },
        { status: 500 }
      );
    }

    // Doble salvaguarda: si algún trigger legatario en BD puso 'active', forzar 'pending' (requiere service_role o update permitido)
    if (inserted.status !== 'pending') {
      await supabase
        .from('profiles')
        .update({ status: 'pending', role: 'employee' })
        .eq('id', inserted.id);
    }

    // 3. Guardar contraseña de forma segura en la bóveda profile_passwords mediante RPC SECURITY DEFINER
    const { data: pwdRes, error: pwdErr } = await supabase.rpc('admin_set_user_password', {
      p_email: email,
      p_password: password,
      p_is_temp: false,
    });

    if (pwdErr || (pwdRes && pwdRes.success === false)) {
      console.warn('[Register API] Aviso guardando contraseña vía RPC:', pwdErr || pwdRes);
      // Fallback directo para entornos donde el trigger vault sigue activo
      await supabase
        .from('profiles')
        .update({ custom_password: password, password_configured: true })
        .eq('id', inserted.id);
    }

    // Reconfirmar estado 'pending' tras sincronización para blindaje absoluto
    if (adminClient) {
      await adminClient
        .from('profiles')
        .update({ status: 'pending', role: 'employee' })
        .eq('id', inserted.id);
    }

    return NextResponse.json({
      success: true,
      profileId: inserted.id,
      status: 'pending',
    });
  } catch (err) {
    console.error('[Register API] Excepción inesperada:', err);
    return NextResponse.json(
      { error: 'Error inesperado al procesar la solicitud de registro.' },
      { status: 500 }
    );
  }
}
