'use server';

import { redirect } from 'next/navigation'
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

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

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-super-secret-key-that-is-at-least-32-bytes-long');
const JWT_ALG = 'HS256';

type AuthState = {
  success: boolean;
  message: string;
  debugInfo?: string;
};

export async function authenticateAdmin(prevState: AuthState | undefined, formData: FormData): Promise<AuthState> {
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
    
    const session = { 
        id: admin.id, 
        email: admin.email,
        name: admin.name 
    };

    const token = await new SignJWT(session)
      .setProtectedHeader({ alg: JWT_ALG })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(JWT_SECRET);
    
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
    client?.release();
  }
  
  redirect('/admin/dashboard');
}
