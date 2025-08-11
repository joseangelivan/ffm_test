
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession, type SessionPayload } from '@/lib/session';
import { verifySessionIntegrity } from '@/actions/admin';

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

async function handleInvalidSession(request: NextRequest) {
    const response = NextResponse.redirect(new URL('/admin/login', request.url));
    response.cookies.delete('session');
    return response;
}

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  const publicPages = ['/', '/login', '/admin/login', '/admin/first-login', '/admin/enter-password', '/admin/verify-2fa'];
  const protectedAdminRoutes = ['/admin/dashboard', '/admin/condominio'];
  const protectedUserRoutes = ['/dashboard'];

  const isPublicPage = publicPages.some(page => pathname.startsWith(page));
  const isAdminRoute = protectedAdminRoutes.some(route => pathname.startsWith(route));
  const isUserRoute = protectedUserRoutes.some(route => pathname.startsWith(route));

  // 1. If no session token exists
  if (!sessionToken) {
    // If trying to access a protected route, redirect to the appropriate login page
    if (isAdminRoute) return NextResponse.redirect(new URL('/admin/login', request.url));
    if (isUserRoute) return NextResponse.redirect(new URL('/login', request.url));
    // Otherwise, allow access to public pages
    return NextResponse.next();
  }

  // 2. If a session token exists, verify it
  const session = await verifySession(sessionToken);

  if (!session) {
    // If token is invalid (expired, malformed), treat as no session
    if (isAdminRoute || isUserRoute) {
      const loginPath = isAdminRoute ? '/admin/login' : '/login';
      return handleInvalidSession(request);
    }
    const response = NextResponse.next();
    response.cookies.delete('session');
    return response;
  }

  // 3. If session is valid, check data integrity
  const isSessionDataValid = await verifySessionIntegrity(session);
  if (!isSessionDataValid) {
    return handleInvalidSession(request);
  }

  // 4. Handle routing for valid sessions
  const isAdmin = session.type === 'admin';
  const isStandardUser = session.type === 'resident' || session.type === 'gatekeeper';
  
  // If user is on a public page, redirect them to their dashboard
  if (isPublicPage) {
    const dashboardPath = isAdmin ? '/admin/dashboard' : '/dashboard';
    return NextResponse.redirect(new URL(dashboardPath, request.url));
  }

  // Prevent cross-access to protected routes
  if (isAdmin && isUserRoute) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }
  if (isStandardUser && isAdminRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // 5. If everything is correct, allow the request to proceed
  return NextResponse.next();
}
