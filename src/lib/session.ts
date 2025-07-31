
'use server';

import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { JWT_SECRET } from '@/lib/config';
import { getDbPool } from './db';

const JWT_ALG = 'HS256';

export type SessionPayload = {
    id: string;
    email: string;
    name: string;
    type: 'admin' | 'resident' | 'gatekeeper';
    canCreateAdmins: boolean;
};

export async function getSession(sessionToken?: string): Promise<SessionPayload | null> {
    if (!sessionToken) return null;

    try {
        const { payload } = await jwtVerify(sessionToken, JWT_SECRET, {
            algorithms: [JWT_ALG],
        });
        
        return {
            id: payload.id as string,
            email: payload.email as string,
            name: payload.name as string,
            type: payload.type as 'admin' | 'resident' | 'gatekeeper',
            canCreateAdmins: payload.canCreateAdmins as boolean,
        };
    } catch (error: any) {
        if (error.code !== 'ERR_JWT_EXPIRED' && error.code !== 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
           console.error('Error verifying JWT:', error);
        }
        return null;
    }
}

export async function createSession(userId: string, userType: 'admin' | 'resident' | 'gatekeeper', userData: {email: string, name: string, canCreateAdmins?: boolean}) {
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();

        const expirationTime = '1h';
        const expirationDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        const sessionPayload = { 
            id: userId, 
            type: userType,
            email: userData.email,
            name: userData.name,
            canCreateAdmins: !!userData.canCreateAdmins
        };
        
        const token = await new SignJWT(sessionPayload)
          .setProtectedHeader({ alg: JWT_ALG })
          .setIssuedAt()
          .setExpirationTime(expirationTime)
          .sign(JWT_SECRET);
        
        await client.query(`DELETE FROM sessions WHERE user_id = $1 AND user_type = $2`, [userId, userType]);
        await client.query('INSERT INTO sessions (user_id, user_type, token, expires_at) VALUES ($1, $2, $3, $4)', [userId, userType, token, expirationDate]);

        if (userType === 'admin') {
            const settingsTable = `admin_settings`;
            const userIdColumn = `admin_id`;
            await client.query(`INSERT INTO ${settingsTable} (${userIdColumn}) VALUES ($1) ON CONFLICT (${userIdColumn}) DO NOTHING;`, [userId]);
        }
        
        const cookieStore = cookies();
        cookieStore.set('session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60, // 1 hour
            path: '/',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        });

        return { success: true };
    } catch(error) {
        console.error(`Error creating session for ${userType} ${userId}:`, error);
        return { success: false };
    } finally {
        if(client) client.release();
    }
}


export async function getCurrentSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session');
  return await getSession(sessionToken?.value);
}

export async function handleLogoutAction() {
    const sessionCookie = await cookies().get('session');
    if (sessionCookie) {
        let client;
        try {
            const pool = await getDbPool();
            client = await pool.connect();
            await client.query('DELETE FROM sessions WHERE token = $1', [sessionCookie.value]);
        } catch (error) {
            console.error('Error clearing session from DB:', error);
        } finally {
             if (client) {
                client.release();
            }
        }
    }
    cookies().delete('session');
}
