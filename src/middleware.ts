import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl.includes('your-project') ||
    supabaseUrl.includes('tu-proyecto')
  ) {
    return response;
  }

  let sessionUser: any = null;

  // Refrescar cookies de sesión de Supabase
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
    // Si falla la verificación remota, continuar
  }

  const pathname = request.nextUrl.pathname;
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/hub') ||
    pathname.startsWith('/apps') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/perfil') ||
    pathname.startsWith('/floating-timer');

  const isAuthRoute = pathname === '/login' || pathname === '/register';

  // Permitir sesión mock solo en desarrollo local si existe cookie de prueba
  const isDev = process.env.NODE_ENV === 'development';
  const hasDevCookie = isDev && request.cookies.has('bug_clockify_user');

  // Interceptación perimetral de seguridad (Zero-Trust Edge Gate)
  if (isProtectedRoute && !sessionUser && !hasDevCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && sessionUser) {
    return NextResponse.redirect(new URL('/hub', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/slack|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
