
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - admin/db-init (the database initializer page)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|admin/db-init).*)',
  ],
};

export async function middleware(request: NextRequest) {
  const session = await getSession();
  const { pathname } = request.nextUrl;

  const publicPages = ['/', '/login', '/admin/login', '/admin/first-login', '/admin/enter-password', '/admin/verify-2fa'];
  const protectedAdminRoutes = ['/admin/dashboard', '/admin/condominio'];
  const protectedUserRoutes = ['/dashboard'];

  const isPublicPage = publicPages.some(page => pathname === page);
  const isAdminRoute = protectedAdminRoutes.some(route => pathname.startsWith(route));
  const isUserRoute = protectedUserRoutes.some(route => pathname.startsWith(route));

  if (session) {
    // If there is a session
    if (isPublicPage) {
      // And the user tries to access a public login page, redirect them to their dashboard
      const url = request.nextUrl.clone();
      url.pathname = session.type === 'admin' ? '/admin/dashboard' : '/dashboard';
      return NextResponse.redirect(url);
    }
  } else {
    // If there is no session
    if (isAdminRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
    if (isUserRoute) {
      // And the user tries to access a protected route, redirect to the main login page
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // If none of the above, let the request continue
  return NextResponse.next();
}
