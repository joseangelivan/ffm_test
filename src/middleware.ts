
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
    const redirectTo = isAdminRoute ? '/admin/login' : '/login';
    return handleInvalidSession(request, redirectTo);
  }
  
  // 3. Handle routing for valid sessions
  const isAdmin = session.type === 'admin';

  // Prevent cross-access to protected routes
  if (isAdmin && isUserRoute) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }
  if (!isAdmin && isAdminRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // 4. If everything is correct, allow the request to proceed
  return NextResponse.next();
}
