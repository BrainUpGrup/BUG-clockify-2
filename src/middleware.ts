import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME, SessionPayload } from '@/lib/auth/session';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let sessionUser: any = null;

  if (
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project') &&
    !supabaseUrl.includes('tu-proyecto')
  ) {
    // Refrescar cookies de sesión de Supabase si existen
    try {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({ name, value, ...options });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: '', ...options });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({ name, value: '', ...options });
          },
        },
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();
      sessionUser = user;
    } catch {
      // Ignorar excepciones de red en Edge
    }
  }

  // Comprobar cookie de sesión criptográfica firmada (HMAC-SHA256)
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const verifiedSession: SessionPayload | null = await verifySessionToken(sessionToken);

  let userRole: 'admin' | 'coordinator' | 'employee' | null = null;
  let userStatus: 'active' | 'pending' | 'rejected' = 'active';

  if (verifiedSession) {
    userRole = verifiedSession.role;
    userStatus = verifiedSession.status;
  } else if (sessionUser) {
    userRole = sessionUser.email === 'appadmin@brainupgrup.com' ? 'admin' : (sessionUser.user_metadata?.role || 'employee');
  }

  const isAuthenticated = !!verifiedSession || !!sessionUser;

  const pathname = request.nextUrl.pathname;
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/hub') ||
    pathname.startsWith('/apps') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/perfil') ||
    pathname.startsWith('/floating-timer');

  const isAuthRoute = pathname === '/login' || pathname === '/register';

  // 1. Interceptación perimetral de seguridad para rutas protegidas no autenticadas
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Control de estado de cuenta: Si la cuenta está pendiente o rechazada, denegar acceso al panel
  if (isProtectedRoute && isAuthenticated && userStatus !== 'active') {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', userStatus === 'pending' ? 'pending' : 'rejected');
    return NextResponse.redirect(loginUrl);
  }

  // 3. Control de Acceso Basado en Roles (RBAC en el Edge)
  if (isProtectedRoute && isAuthenticated) {
    // Protección de /dashboard/admin: Solo rol 'admin'
    if (pathname.startsWith('/dashboard/admin') && userRole !== 'admin') {
      const redirectTarget = userRole === 'coordinator' ? '/dashboard/coordinator' : '/dashboard/employee';
      return NextResponse.redirect(new URL(redirectTarget, request.url));
    }

    // Protección de /dashboard/coordinator: Solo rol 'coordinator' o 'admin'
    if (pathname.startsWith('/dashboard/coordinator') && userRole !== 'coordinator' && userRole !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard/employee', request.url));
    }
  }

  // 4. Redirección inteligente: si ya está autenticado y accede a /login o /register (sin force ni logout)
  if (isAuthRoute && isAuthenticated && userStatus === 'active') {
    const hasBypassParam =
      request.nextUrl.searchParams.has('force') ||
      request.nextUrl.searchParams.has('logout') ||
      request.nextUrl.searchParams.has('invite');

    if (!hasBypassParam) {
      const destination =
        userRole === 'admin'
          ? '/dashboard/admin'
          : userRole === 'coordinator'
          ? '/dashboard/coordinator'
          : '/dashboard/employee';
      return NextResponse.redirect(new URL(destination, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/slack|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
