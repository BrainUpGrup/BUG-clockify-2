import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { signSessionToken, verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { UserRole, ProfileStatus, Profile } from '@/types/database';

// Rate Limiter en memoria: IP/email -> intentos fallidos y timestamp
const loginRateLimitMap = new Map<string, { count: number; firstAttempt: number }>();
const MAX_FAILED_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minuto

function checkRateLimit(key: string): { blocked: boolean; remainingSeconds: number } {
  const now = Date.now();
  const entry = loginRateLimitMap.get(key);

  if (!entry) return { blocked: false, remainingSeconds: 0 };

  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    loginRateLimitMap.delete(key);
    return { blocked: false, remainingSeconds: 0 };
  }

  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    const remaining = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - entry.firstAttempt)) / 1000);
    return { blocked: true, remainingSeconds: remaining };
  }

  return { blocked: false, remainingSeconds: 0 };
}

function recordFailedAttempt(key: string) {
  const now = Date.now();
  const entry = loginRateLimitMap.get(key);
  if (!entry || now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    loginRateLimitMap.set(key, { count: 1, firstAttempt: now });
  } else {
    entry.count += 1;
  }
}

function resetFailedAttempts(key: string) {
  loginRateLimitMap.delete(key);
}

export async function GET(req: NextRequest) {
  const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return NextResponse.json({ authenticated: false });
  }

  const verified = await verifySessionToken(sessionToken);
  if (!verified || verified.status !== 'active') {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: verified.id,
      email: verified.email,
      role: verified.role,
      status: verified.status,
      department: verified.department,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, user } = body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const isSupabaseConfigured =
      supabaseUrl &&
      supabaseAnonKey &&
      !supabaseUrl.includes('your-project') &&
      !supabaseUrl.includes('tu-proyecto');

    // 1. CASO A: RE-SINCRONIZACIÓN DE SESIÓN EXISTENTE (Solo si ya posee cookie válida firmada)
    if (user && user.email && !password) {
      const existingCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
      if (!existingCookie) {
        return NextResponse.json(
          { error: 'No autorizado. Se requiere contraseña para iniciar sesión.' },
          { status: 401 }
        );
      }

      const verifiedSession = await verifySessionToken(existingCookie);
      const cleanEmail = String(user.email).trim().toLowerCase();

      // Verificar que la cookie corresponda exactamente al mismo usuario autenticado
      if (!verifiedSession || verifiedSession.email.toLowerCase() !== cleanEmail) {
        return NextResponse.json(
          { error: 'Violación de sesión. No puedes re-firmar la sesión de otro usuario.' },
          { status: 403 }
        );
      }

      // Re-firmar preservando el rol ya validado (prevención estricta de escalada de privilegios)
      const token = await signSessionToken({
        id: verifiedSession.id,
        email: verifiedSession.email,
        role: verifiedSession.role, // Mantiene el rol legítimo verificado
        status: verifiedSession.status,
        department: user.department || verifiedSession.department,
      });

      const res = NextResponse.json({
        success: true,
        user: {
          id: verifiedSession.id,
          email: verifiedSession.email,
          role: verifiedSession.role,
          status: verifiedSession.status,
        },
      });

      res.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });

      return res;
    }

    // 2. CASO B: AUTENTICACIÓN INICIAL CON CONTRASEÑA
    if (!email || !password) {
      return NextResponse.json(
        { error: 'El correo electrónico y la contraseña son obligatorios.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPass = String(password).trim();
    const rateLimitKey = `${cleanEmail}`;

    // Comprobación de Rate Limiting
    const rateStatus = checkRateLimit(rateLimitKey);
    if (rateStatus.blocked) {
      return NextResponse.json(
        { error: `Demasiados intentos fallidos. Por seguridad, espera ${rateStatus.remainingSeconds} segundos.` },
        { status: 429 }
      );
    }

    let authenticatedProfile: Profile | null = null;

    if (isSupabaseConfigured) {
      const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

      // A) Autenticación segura mediante RPC (SECURITY DEFINER)
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('authenticate_employee', {
          p_email: cleanEmail,
          p_password: cleanPass,
        });

        if (!rpcErr && rpcRes && rpcRes.success === true && rpcRes.user) {
          authenticatedProfile = rpcRes.user as Profile;
        } else if (rpcRes && rpcRes.error) {
          if (rpcRes.error.includes('PENDIENTE')) {
            return NextResponse.json({ error: rpcRes.error }, { status: 403 });
          }
          if (rpcRes.error.includes('rechazada')) {
            return NextResponse.json({ error: rpcRes.error }, { status: 403 });
          }
        }
      } catch (rpcE) {
        console.warn('Aviso RPC authenticate_employee:', rpcE);
      }

      // B) Fallback: Supabase Auth nativo
      if (!authenticatedProfile) {
        try {
          const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPass,
          });

          if (!authErr && authData?.user) {
            const { data: dbProf } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authData.user.id)
              .maybeSingle();

            if (dbProf) {
              authenticatedProfile = dbProf as Profile;
            }
          }
        } catch (authE) {
          console.warn('Aviso Supabase Auth signInWithPassword:', authE);
        }
      }
    }

    // C) Fallback local demo/dev si Supabase no está disponible
    if (!authenticatedProfile && !isSupabaseConfigured && process.env.NODE_ENV !== 'production') {
      if (cleanEmail === 'appadmin@brainupgrup.com' && cleanPass === '123456') {
        authenticatedProfile = {
          id: '8b2a428b-9fb2-4a26-b298-696f8510d770',
          full_name: 'Super Administrador',
          email: 'appadmin@brainupgrup.com',
          role: 'admin',
          status: 'active',
          department: 'Sistemas & Seguridad',
          created_at: '2026-01-01T00:00:00Z',
        };
      } else if (cleanEmail === 'montse@brainupgrup.com' && cleanPass === 'cordinadora2026') {
        authenticatedProfile = {
          id: '755e8812-8e22-43f1-ac6f-f41ce5451fcf',
          full_name: 'Montse',
          email: 'montse@brainupgrup.com',
          role: 'coordinator',
          status: 'active',
          department: 'Coordinación & Dirección',
          created_at: '2026-10-14T10:35:57Z',
        };
      }
    }

    // Si fallaron todas las validaciones de credenciales
    if (!authenticatedProfile) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        { error: 'Correo o contraseña incorrectos. Verifica tus credenciales.' },
        { status: 401 }
      );
    }

    // Comprobación de estado de cuenta
    if (authenticatedProfile.status === 'pending') {
      return NextResponse.json(
        { error: 'Tu cuenta está registrada pero aún está pendiente de validación por coordinación.' },
        { status: 403 }
      );
    }

    if (authenticatedProfile.status === 'rejected') {
      return NextResponse.json(
        { error: 'Tu solicitud de acceso ha sido rechazada.' },
        { status: 403 }
      );
    }

    // Éxito: Limpiar intentos fallidos
    resetFailedAttempts(rateLimitKey);

    const safeRole: UserRole =
      cleanEmail === 'appadmin@brainupgrup.com' ? 'admin' : (authenticatedProfile.role || 'employee');

    // Firmar criptográficamente el token de sesión
    const token = await signSessionToken({
      id: authenticatedProfile.id,
      email: cleanEmail,
      role: safeRole,
      status: authenticatedProfile.status || 'active',
      department: authenticatedProfile.department,
    });

    const res = NextResponse.json({
      success: true,
      user: {
        id: authenticatedProfile.id,
        email: cleanEmail,
        role: safeRole,
        status: authenticatedProfile.status,
        full_name: authenticatedProfile.full_name,
      },
    });

    // Inyectar cookie HttpOnly firmada e inviolable
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
      { error: 'Error interno del servidor al procesar la autenticación.' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true, message: 'Sesión finalizada correctamente.' });

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
