'use server';

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

export async function authenticateAdmin(prevState: { message: string } | undefined, formData: FormData): Promise<{ success: boolean; message: string }> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, message: 'Email and password are required.' };
  }

  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT * FROM platform_admins WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return { success: false, message: 'Invalid credentials.' };
    }

    const admin = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, admin.password_hash);

    if (!passwordMatch) {
      return { success: false, message: 'Invalid credentials.' };
    }
    
    // Create session
    const session = { 
        id: admin.id, 
        email: admin.email,
        name: admin.name 
    };

    // Create JWT
    const token = await new SignJWT(session)
      .setProtectedHeader({ alg: JWT_ALG })
      .setIssuedAt()
      .setExpirationTime('1h') // Token expires in 1 hour
      .sign(JWT_SECRET);
    
    // Set cookie
    cookies().set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60, // 1 hour
        path: '/',
    });

    return { success: true, message: 'Login successful.' };

  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, message: 'An internal server error occurred.' };
  } finally {
    client?.release();
  }
}