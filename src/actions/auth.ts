
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

// Function to ensure the tables exist
async function ensureTablesExist() {
  const client = await pool.connect();
  try {
    // Create admins table first
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Then create sessions table
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
        // 1. Verify the JWT signature and structure
        const { payload } = await jwtVerify(sessionToken, JWT_SECRET, {
            algorithms: [JWT_ALG],
        });

        // 2. Verify the session exists in the database
        client = await pool.connect();
        const result = await client.query('SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()', [sessionToken]);

        if (result.rows.length === 0) {
            // Token is valid but not in DB or expired, so invalidate cookie
            cookies().delete('session');
            return null;
        }

        // We can augment the payload with more user info from the DB if needed
        const sessionData = {
            ...payload
        };

        return sessionData;

    } catch (error) {
        console.error('Failed to verify session:', error);
        return null;
    } finally {
        if (client) {
            client.release();
        }
    }
}


export async function authenticateAdmin(prevState: AuthState | undefined, formData: FormData): Promise<AuthState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, message: 'Email and password are required.' };
  }

  let client;
  try {
    client = await pool.connect();

    // Ensure the tables exist before proceeding
    await ensureTablesExist();

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
            await client.query('DELETE FROM sessions WHERE token = $1', [sessionToken]);
        } catch (error) {
            console.error('Error clearing session from DB:', error);
        } finally {
             if (client) {
                client.release();
            }
        }
    }
    cookies().delete('session');
    redirect('/admin/login');
}
