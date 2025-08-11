
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

async function handleInvalidSession(request: NextRequest, isPublicPage: boolean) {
    const response = isPublicPage 
        ? NextResponse.next() 
        : NextResponse.redirect(new URL('/admin/login', request.url));
    
    response.cookies.delete('session');
    return response;
}

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  const publicPages = ['/', '/login', '/admin/login', '/admin/first-login', '/admin/enter-password', '/admin/verify-2fa'];
  const protectedAdminRoutes = ['/admin/dashboard', '/admin/condominio'];
  const protectedUserRoutes = ['/dashboard'];

  const isPublicPage = publicPages.some(page => pathname === page);
  const isAdminRoute = protectedAdminRoutes.some(route => pathname.startsWith(route));
  const isUserRoute = protectedUserRoutes.some(route => pathname.startsWith(route));

  if (!sessionToken) {
    if (isAdminRoute || isUserRoute) {
      const loginPath = isAdminRoute ? '/admin/login' : '/login';
      return NextResponse.redirect(new URL(loginPath, request.url));
    }
    return NextResponse.next();
  }
  
  const session = await verifySession(sessionToken);

  if (session) {
    const isSessionDataValid = await verifySessionIntegrity(session);
    
    if (!isSessionDataValid) {
        return handleInvalidSession(request, isPublicPage);
    }

    const dashboardPath = session.type === 'admin' ? '/admin/dashboard' : '/dashboard';
    
    if (isPublicPage) {
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
    
    if (session.type === 'admin' && isUserRoute) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }

    if ((session.type === 'resident' || session.type === 'gatekeeper') && isAdminRoute) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

  } else {
    // Invalid token
    if (isAdminRoute || isUserRoute) {
        const loginPath = isAdminRoute ? '/admin/login' : '/login';
        const response = NextResponse.redirect(new URL(loginPath, request.url));
        response.cookies.delete('session');
        return response;
    }
  }
  
  return NextResponse.next();
}
