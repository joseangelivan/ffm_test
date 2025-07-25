
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

/**
 * Ensures the database schema is up to date by creating initial tables 
 * and applying any necessary incremental migrations.
 * This function will be expanded in the future to run ALTER TABLE scripts
 * to preserve existing data when the schema changes.
 */
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

    // Create admin_settings table with a foreign key to admins
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
        theme VARCHAR(255) DEFAULT 'light',
        language VARCHAR(10) DEFAULT 'es',
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure settings row exists for new admins after they are created
    // This part is handled within the login logic to ensure it runs for new users.
    
  } finally {
    client.release();
  }
}

type AuthState = {
  success: boolean;
  message: string;
  debugInfo?: string;
};

type AdminSettings = {
    theme: 'light' | 'dark';
    language: 'es' | 'pt';
}

export async function getAdminSettings(): Promise<AdminSettings | null> {
    await ensureTablesExist();
    const session = await getSession();
    if (!session) return null;

    let client;
    try {
        client = await pool.connect();
        const result = await client.query('SELECT theme, language FROM admin_settings WHERE admin_id = $1', [session.id]);
        
        if (result.rows.length > 0) {
            return result.rows[0] as AdminSettings;
        }

        // If no settings found, create default ones
        await client.query('INSERT INTO admin_settings (admin_id, theme, language) VALUES ($1, $2, $3) ON CONFLICT (admin_id) DO NOTHING', [session.id, 'light', 'es']);
        return { theme: 'light', language: 'es' };

    } catch (error) {
        console.error('Failed to get admin settings:', error);
        return null;
    } finally {
        if (client) client.release();
    }
}

export async function updateAdminSettings(settings: Partial<AdminSettings>): Promise<{success: boolean}> {
    await ensureTablesExist();
    const session = await getSession();
    if (!session) return { success: false };

    let client;
    try {
        client = await pool.connect();
        const setClauses = [];
        const values = [];
        let valueIndex = 1;

        if (settings.theme) {
            setClauses.push(`theme = $${valueIndex++}`);
            values.push(settings.theme);
        }
        if (settings.language) {
            setClauses.push(`language = $${valueIndex++}`);
            values.push(settings.language);
        }

        if (setClauses.length === 0) {
            return { success: true }; // Nothing to update
        }

        values.push(session.id);
        const query = `UPDATE admin_settings SET ${setClauses.join(', ')}, updated_at = NOW() WHERE admin_id = $${valueIndex}`;
        
        await client.query(query, values);
        
        return { success: true };
    } catch (error) {
        console.error('Failed to update admin settings:', error);
        return { success: false };
    } finally {
        if (client) client.release();
    }
}

export async function getSession() {
    await ensureTablesExist();
    const sessionToken = cookies().get('session')?.value;
    if (!sessionToken) return null;

    let client;
    try {
        client = await pool.connect();
        const result = await client.query(
            'SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()', 
            [sessionToken]
        );

        if (result.rows.length === 0) {
            cookies().delete('session');
            return null;
        }

        // The session is valid according to the database, now decode the token payload.
        // We ignore the expiration check here because the DB query already handled it.
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
        // This could happen if the token is malformed or the secret is wrong.
        console.error('Failed to verify session, possibly malformed token:', error);
        cookies().delete('session');
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
    
    // Clear any existing sessions for this user to enforce one session at a time
    await client.query('DELETE FROM sessions WHERE admin_id = $1', [admin.id]);
    
    // Store new session in the database
    await client.query('INSERT INTO sessions (admin_id, token, expires_at) VALUES ($1, $2, $3)', [admin.id, token, expirationDate]);
    
    // Ensure admin settings row exists
    await client.query('INSERT INTO admin_settings (admin_id) VALUES ($1) ON CONFLICT (admin_id) DO NOTHING;', [admin.id]);

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
