'use server';

import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';
import {jwtVerify} from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ||
    'your-super-secret-key-that-is-at-least-32-bytes-long'
);

const getSession = async (token: string | undefined) => {
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload;
    } catch (error) {
        console.error('JWT Verification Error:', error);
        return null;
    }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get('session')?.value;
  
  const session = await getSession(sessionToken);

  const isTryingToAccessProtectedRoute = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isTryingToAccessLoginPage = pathname === '/admin/login';

  // If no session, and trying to access a protected route, redirect to login
  if (!session && isTryingToAccessProtectedRoute) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // If session exists, and trying to access login page, redirect to dashboard
  if (session && isTryingToAccessLoginPage) {
     return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }
  
  return NextResponse.next();
}

// This config ensures the middleware runs on all admin routes.
export const config = {
  matcher: '/admin/:path*',
};
