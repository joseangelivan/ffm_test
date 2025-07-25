'use server';

import { Pool } from 'pg';
import bcrypt from 'bcrypt';

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

    // On success, return a success state. The client component will handle the redirect.
    return { success: true, message: 'Login successful.' };

  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, message: 'An internal server error occurred.' };
  } finally {
    client?.release();
  }
}
