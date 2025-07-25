
'use server';

import { redirect } from 'next/navigation'
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { JWT_SECRET } from '@/lib/config';
import fs from 'fs/promises';
import path from 'path';

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

// --- Migration Runner ---
let migrationsApplied = false;

/**
 * Migration Runner (Optimized).
 * Ensures the database schema is up to date by applying migration scripts
 * from the src/lib/migrations directory.
 * This function is optimized to only run the migration logic once per application
 * lifecycle, using a flag to prevent redundant checks.
 */
async function runMigrations() {
    console.log("runMigrations called.");
    if (migrationsApplied) {
        console.log("Skipping migrations: already applied in this lifecycle.");
        return; 
    }

    const client = await pool.connect();
    try {
        console.log("Starting migration process...");
        // 1. Ensure migrations table exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id VARCHAR(255) PRIMARY KEY,
                applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Get applied migrations from DB
        const appliedMigrationsResult = await client.query('SELECT id FROM migrations');
        const appliedMigrationIds = new Set(appliedMigrationsResult.rows.map(r => r.id));
        console.log("Applied migrations found in DB:", Array.from(appliedMigrationIds));


        // 3. Read migration files from directory
        const migrationsDir = path.join(process.cwd(), 'src', 'lib', 'migrations');
        const migrationFiles = (await fs.readdir(migrationsDir)).filter(file => file.endsWith('.sql')).sort();
        console.log("Migration files found in directory:", migrationFiles);


        // 4. Apply pending migrations
        for (const file of migrationFiles) {
            const migrationId = path.basename(file, '.sql');
            if (!appliedMigrationIds.has(migrationId)) {
                console.log(`Applying migration: ${migrationId}`);
                const sql = await fs.readFile(path.join(migrationsDir, file), 'utf-8');
                
                await client.query('BEGIN'); // Start transaction
                try {
                    await client.query(sql);
                    await client.query('INSERT INTO migrations (id) VALUES ($1)', [migrationId]);
                    await client.query('COMMIT'); // Commit transaction
                    console.log(`Successfully applied migration: ${migrationId}`);
                } catch (e) {
                    await client.query('ROLLBACK'); // Rollback on error
                    console.error(`Failed to apply migration ${migrationId}:`, e);
                    throw e;
                }
            }
        }
        
        console.log("Migration process completed successfully.");
        migrationsApplied = true; // Set the flag to true after successful execution.

    } catch (error) {
        console.error("Migration failed:", error);
        // We don't set the flag to true if migrations fail, so it can be retried on a subsequent request.
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
    await runMigrations();
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
    await runMigrations();
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
    await runMigrations();
    const sessionToken = cookies().get('session')?.value;
    if (!sessionToken) return null;

    let client;
    try {
        client = await pool.connect();
        const result = await client.query(
            'SELECT admin_id FROM sessions WHERE token = $1 AND expires_at > NOW()', 
            [sessionToken]
        );

        if (result.rows.length === 0) {
            return null; 
        }

        const { payload } = await jwtVerify(sessionToken, JWT_SECRET, {
            algorithms: [JWT_ALG],
            ignoreExpiration: true, 
        });

        const adminResult = await client.query('SELECT name, email FROM admins WHERE id = $1', [payload.id]);
        if(adminResult.rows.length === 0) {
            return null;
        }

        return {
            id: payload.id as string,
            email: adminResult.rows[0].email as string,
            name: adminResult.rows[0].name as string,
        };

    } catch (error) {
        console.error('Failed to verify session, possibly malformed or invalid token:', error);
        return null;
    } finally {
        if (client) {
            client.release();
        }
    }
}


export async function authenticateAdmin(prevState: AuthState | undefined, formData: FormData): Promise<AuthState> {
  await runMigrations();
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
        id: admin.id
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
    await runMigrations();
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
