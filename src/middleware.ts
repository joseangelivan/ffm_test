
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession, type SessionPayload } from '@/lib/session';

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

async function handleInvalidSession(request: NextRequest, redirectTo: string) {
    const response = NextResponse.redirect(new URL(redirectTo, request.url));
    response.cookies.delete('session');
    return response;
}

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  const publicPages = ['/', '/login', '/admin/login', '/admin/first-login', '/admin/enter-password', '/admin/verify-2fa'];
  
  const isPublicPage = publicPages.includes(pathname);

  // 1. Verify session
  const session = sessionToken ? await verifySession(sessionToken) : null;

  // 2. Redirect logged-in users from public pages
  if (session && isPublicPage) {
    const dashboardUrl = session.type === 'admin' ? '/admin/dashboard' : '/dashboard';
    return NextResponse.redirect(new URL(dashboardUrl, request.url));
  }

  // 3. Protect routes for non-logged-in users
  if (!session && !isPublicPage) {
     const isAdminRoute = pathname.startsWith('/admin');
     const loginUrl = isAdminRoute ? '/admin/login' : '/login';
     return NextResponse.redirect(new URL(loginUrl, request.url));
  }

  // 4. Prevent cross-access for logged-in users
  if (session) {
      const isAdmin = session.type === 'admin';
      const isTryingAdminRoute = pathname.startsWith('/admin');
      const isTryingUserRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/gatekeeper');

      if (isAdmin && isTryingUserRoute) {
          return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      if (!isAdmin && isTryingAdminRoute) {
          return NextResponse.redirect(new URL('/dashboard', request.url));
      }
  }

  // 5. If everything is correct, allow the request to proceed
  return NextResponse.next();
}
