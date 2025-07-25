
'use server';

import { redirect } from 'next/navigation'
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { JWT_SECRET } from '@/lib/config';

const pool = new Pool({
  host: 'mainline.proxy.rlwy.net',
  port: 38539,
  user: 'postgres',
  password: 'vxLaQxZOIeZNIIvCvjXEXYEhRAMmiUTT',
  database: 'railway',
  ssl: {
    rejectUnauthorized: false,
  },
});

const JWT_ALG = 'HS256';

// Function to ensure the tables exist in the correct order
async function ensureTablesExist() {
  const client = await pool.connect();
  try {
    // Create admins table first because sessions depends on it
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Then create sessions table with a foreign key to admins
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } finally {
    client.release();
  }
}

type AuthState = {
  success: boolean;
  message: string;
  debugInfo?: string;
};

export async function getSession() {
    await ensureTablesExist();
    const sessionToken = cookies().get('session')?.value;
    if (!sessionToken) return null;

    let client;
    try {
        // The database is the source of truth.
        // Check if the session token exists in the database and is not expired.
        client = await pool.connect();
        const result = await client.query(
            'SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()', 
            [sessionToken]
        );

        if (result.rows.length === 0) {
            // If the session is not in our DB or is expired, invalidate cookie and return null.
            cookies().delete('session');
            return null;
        }

        // If the session exists in the DB, we can trust the JWT.
        // We verify it to get the payload. We can ignore expiration here because the DB already checked it.
        const { payload } = await jwtVerify(sessionToken, JWT_SECRET, {
            algorithms: [JWT_ALG],
            ignoreExpiration: true, 
        });

        return {
            id: payload.id as string,
            email: payload.email as string,
            name: payload.name as string,
        };

    } catch (error) {
        // This will catch errors from jwtVerify (e.g., signature invalid) or DB errors.
        console.error('Failed to verify session:', error);
        return null;
    } finally {
        if (client) {
            client.release();
        }
    }
}


export async function authenticateAdmin(prevState: AuthState | undefined, formData: FormData): Promise<AuthState> {
  await ensureTablesExist();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, message: 'Email and password are required.' };
  }

  let client;
  try {
    client = await pool.connect();

    const result = await client.query('SELECT * FROM admins WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return { 
        success: false, 
        message: 'Invalid credentials.',
        debugInfo: `No user found with email: ${email}.`
      };
    }

    const admin = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, admin.password_hash);
    
    if (!passwordMatch) {
      return { 
          success: false, 
          message: 'Invalid credentials.',
          debugInfo: `Password mismatch for user ${email}.`
      };
    }
    
    const expirationTime = '1h';
    const expirationDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    const sessionPayload = { 
        id: admin.id, 
        email: admin.email,
        name: admin.name 
    };

    const token = await new SignJWT(sessionPayload)
      .setProtectedHeader({ alg: JWT_ALG })
      .setIssuedAt()
      .setExpirationTime(expirationTime)
      .sign(JWT_SECRET);
    
    // Store session in the database
    await client.query('INSERT INTO sessions (admin_id, token, expires_at) VALUES ($1, $2, $3)', [admin.id, token, expirationDate]);

    // Set the cookie
    cookies().set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60, // 1 hour
        path: '/',
    });
    
  } catch (error: any) {
    console.error('Error during authentication:', error);
    return { 
      success: false, 
      message: 'An internal server error occurred.',
      debugInfo: `Error caught: ${error.message}. Stack: ${error.stack}`
    };
  } finally {
    if (client) {
        client.release();
    }
  }
  
  redirect('/admin/dashboard');
}

export async function logout() {
    await ensureTablesExist();
    const sessionToken = cookies().get('session')?.value;
    if (sessionToken) {
        let client;
        try {
            client = await pool.connect();
            // Delete the specific session token from the database
            await client.query('DELETE FROM sessions WHERE token = $1', [sessionToken]);
        } catch (error) {
            console.error('Error clearing session from DB:', error);
        } finally {
             if (client) {
                client.release();
            }
        }
    }
    // In any case, delete the cookie
    cookies().delete('session');
    redirect('/admin/login');
}
