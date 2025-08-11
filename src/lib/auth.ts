
'use server';

import { cookies } from 'next/headers';
import { verifySession, type SessionPayload } from '@/lib/session';

/**
 * Retrieves the current user session from the request cookies.
 * This is the recommended way to access session data in Server Components.
 * @returns {Promise<SessionPayload | null>} The session payload if the user is authenticated, otherwise null.
 */
export async function getSession(): Promise<SessionPayload | null> {
    const sessionCookie = (await cookies()).get('session');
    if (!sessionCookie) {
        return null;
    }
    const sessionToken = sessionCookie.value;
    return await verifySession(sessionToken);
}
