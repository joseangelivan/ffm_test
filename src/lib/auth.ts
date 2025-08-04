'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession as getSessionFromToken, type SessionPayload } from '@/lib/session';

/**
 * Verifies the current user's session from the cookie.
 * If the session is not valid or doesn't exist, it redirects to the login page.
 * @returns The session payload if valid.
 */
export async function verifySession(): Promise<SessionPayload> {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session')?.value;

  if (!sessionToken) {
    redirect('/admin/login');
  }

  const session = await getSessionFromToken(sessionToken);

  if (!session) {
    // Purge the invalid cookie
    cookieStore.set('session', '', { expires: new Date(0) });
    redirect('/admin/login?error=session_invalidated');
  }

  return session;
}


/**
 * Gets the current session from the cookie without redirecting.
 * @returns The session payload or null if not valid.
 */
export async function getSession(): Promise<SessionPayload | null> {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('session')?.value;
    if(!sessionToken) return null;
    return await getSessionFromToken(sessionToken);
}
