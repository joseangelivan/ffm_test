
'use server';

import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { JWT_SECRET } from '@/lib/config';
import { getDbPool } from './db';
import { randomUUID } from 'crypto';

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

        const expirationTime = '2h';
        const expirationDate = new Date(Date.now() + 2 * 60 * 60 * 1000); 

        const sessionPayload: SessionPayload = { 
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
        
        await client.query('BEGIN');
        
        // Remove old sessions for this user to avoid conflicts
        await client.query(`DELETE FROM sessions WHERE user_id = $1 AND user_type = $2`, [userId, userType]);
        
        const sessionId = randomUUID();
        await client.query(
            'INSERT INTO sessions (id, user_id, user_type, token, expires_at) VALUES ($1, $2, $3, $4, $5)', 
            [sessionId, userId, userType, token, expirationDate]
        );
        
        await client.query('COMMIT');
        
        cookies().set('session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            expires: expirationDate,
            path: '/',
            sameSite: 'lax',
        });

        console.log(`[createSession] Session successfully created for ${userType} ${userId}.`);
        return { success: true };

    } catch(error) {
        if(client) {
            try {
                await client.query('ROLLBACK');
            } catch (rbError) {
                console.error('[createSession] Error rolling back transaction:', rbError);
            }
        }
        console.error(`[createSession] CRITICAL: Error creating session for ${userType} ${userId}:`, error);
        return { success: false, message: 'Failed to create session in database.' };
    } finally {
        if(client) client.release();
    }
}


export async function getCurrentSession(): Promise<SessionPayload | null> {
  const sessionToken = cookies().get('session');
  if (!sessionToken) return null;
  return await getSession(sessionToken.value);
}

export async function handleLogoutAction() {
    const sessionCookie = cookies().get('session');
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


    
