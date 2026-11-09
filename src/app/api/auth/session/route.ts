import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { signSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { UserRole, ProfileStatus } from '@/types/database';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user } = body;

    if (!user || !user.email) {
      return NextResponse.json(
        { error: 'Datos de perfil de usuario incompletos.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(user.email).trim().toLowerCase();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const isSupabaseConfigured =
      supabaseUrl &&
      supabaseAnonKey &&
      !supabaseUrl.includes('your-project') &&
      !supabaseUrl.includes('tu-proyecto');

    let verifiedId = user.id || 'demo-user-id';
    let verifiedRole: UserRole = user.role || 'employee';
    let verifiedStatus: ProfileStatus = user.status || 'active';
    let verifiedDepartment = user.department;

    if (isSupabaseConfigured) {
      const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
      const { data: dbProf, error: dbErr } = await supabase
        .from('profiles')
        .select('id, email, role, status, department')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (dbErr) {
        console.error('Error al verificar perfil para sesión en Supabase:', dbErr.message);
      }

      if (dbProf) {
        if (dbProf.status === 'rejected') {
          return NextResponse.json(
            { error: 'Tu solicitud de acceso fue rechazada.' },
            { status: 403 }
          );
        }
        verifiedId = dbProf.id;
        verifiedRole = (cleanEmail === 'appadmin@brainupgrup.com' ? 'admin' : dbProf.role) as UserRole;
        verifiedStatus = dbProf.status as ProfileStatus;
        verifiedDepartment = dbProf.department;
      }
    }

    // Firmar criptográficamente el payload de la sesión
    const token = await signSessionToken({
      id: verifiedId,
      email: cleanEmail,
      role: verifiedRole,
      status: verifiedStatus,
      department: verifiedDepartment,
    });

    const res = NextResponse.json({
      success: true,
      user: {
        id: verifiedId,
        email: cleanEmail,
        role: verifiedRole,
        status: verifiedStatus,
      },
    });

    // Inyectar cookie HttpOnly firmada
    res.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 días
    });

    return res;
  } catch (err) {
    console.error('Error en POST /api/auth/session:', err);
    return NextResponse.json(
      { error: 'Error interno al establecer la sesión criptográfica.' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true, message: 'Sesión finalizada.' });

  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return res;
}
