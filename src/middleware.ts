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
      // Si falla la verificación remota, continuar con verificación de cookie corporativa
    }
  }

  // Comprobar cookie de sesión corporativa (válida en local y producción)
  const authCookie = request.cookies.get('bug_clockify_user')?.value;
  let hasValidAuthCookie = false;
  if (authCookie) {
    try {
      const decoded = decodeURIComponent(authCookie);
      const parsed = JSON.parse(decoded);
      if (parsed && (parsed.email || parsed.id)) {
        hasValidAuthCookie = true;
      }
    } catch {
      hasValidAuthCookie = false;
    }
  }

  const isAuthenticated = !!sessionUser || hasValidAuthCookie;

  const pathname = request.nextUrl.pathname;
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/hub') ||
    pathname.startsWith('/apps') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/perfil') ||
    pathname.startsWith('/floating-timer');

  // Interceptación perimetral de seguridad (Zero-Trust Edge Gate)
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/slack|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
