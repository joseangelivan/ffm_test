
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession as getSessionFromToken, type SessionPayload } from '@/lib/session';


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
