
'use server';

import { cookies } from 'next/headers';
import { verifySession, type SessionPayload } from '@/lib/session';

/**
 * Gets the current session from the cookie.
 * This function is safe to use in client components and server components.
 * It does not contain any server-only dependencies besides what is allowed.
 * @returns The session payload or null if not valid.
 */
export async function getSession(): Promise<SessionPayload | null> {
    const sessionToken = cookies().get('session')?.value;
    if(!sessionToken) return null;
    
    // verifySession is designed to be safe and will handle the import of 'jose' internally.
    const session = await verifySession(sessionToken);
    if (!session) return null;

    return session;
}
