'use server';

import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';
import {jwtVerify} from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ||
    'your-super-secret-key-that-is-at-least-32-bytes-long'
);

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('session')?.value;
  const {pathname} = request.nextUrl;

  const isLoginPage = pathname === '/admin/login';
  
  let isSessionValid = false;
  if(sessionToken) {
    try {
      await jwtVerify(sessionToken, JWT_SECRET);
      isSessionValid = true;
    } catch(err) {
      isSessionValid = false;
    }
  }


  if (isSessionValid) {
    // If the user is logged in and tries to access the login page, redirect to dashboard
    if (isLoginPage) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  } else {
    // If the user is not logged in and tries to access any page other than login, redirect to login
    if (!isLoginPage) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
