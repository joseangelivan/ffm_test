import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-super-secret-key-that-is-at-least-32-bytes-long');

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session');
  const { pathname } = request.nextUrl;

  // If the user is trying to access the login page
  if (pathname.startsWith('/admin/login')) {
    if (sessionCookie) {
      try {
        // If the token is valid, redirect to the dashboard
        await jwtVerify(sessionCookie.value, JWT_SECRET);
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      } catch (e) {
        // Token is invalid or expired, allow access to the login page
        return NextResponse.next();
      }
    }
    // No session cookie, allow access to the login page
    return NextResponse.next();
  }
  
  // For any other admin path, verify the session
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  try {
    await jwtVerify(sessionCookie.value, JWT_SECRET);
    return NextResponse.next()
  } catch (e) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/admin/dashboard/:path*', '/admin/login'],
}
