
'use server';

import { redirect } from 'next/navigation'
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { JWT_SECRET } from '@/lib/config';
import fs from 'fs/promises';
import path from 'path';

// --- Database Pool and Migration Logic ---

let pool: Pool | undefined;
let migrationsHaveRun = false;

async function getDbPool(): Promise<Pool> {
    if (pool) {
        return pool;
    }

    const newPool = new Pool({
        host: 'mainline.proxy.rlwy.net',
        port: 38539,
        user: 'postgres',
        password: 'vxLaQxZOIeZNIIvCvjXEXYEhRAMmiUTT',
        database: 'railway',
        ssl: {
            rejectUnauthorized: false,
        },
    });

    // The first time the pool is created, run migrations.
    // Subsequent calls will return the existing pool.
    try {
        await runMigrations(newPool);
        pool = newPool;
        return pool;
    } catch (error) {
        console.error("CRITICAL: Failed to initialize database connection and run migrations. The application may not function.", error);
        // We re-throw here to ensure that parts of the app that depend on the DB
        // don't proceed in a broken state.
        throw new Error("Database initialization failed.");
    }
}

async function runMigrations(p: Pool) {
    if (migrationsHaveRun) {
        return;
    }
    
    console.log('--- Starting database migration process ---');
    const client = await p.connect();
    try {
        // Step 1: Ensure the migrations table exists.
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                migration_name VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMPTZ DEFAULT NOW(),
                sql_script TEXT
            );
        `);

        // Step 2: Check if this is a new database by looking for a marker migration or any applied migrations.
        const initialSetupResult = await client.query("SELECT to_regclass('public.admins') as table_exists;");
        const isNewDatabase = initialSetupResult.rows[0].table_exists === null;

        if (isNewDatabase) {
            console.log("No existing 'admins' table found. Assuming a new database setup.");
            
            const baseSchemaDirs = ['sql/admin', 'sql/residents', 'sql/entry_control', 'sql/sessions'];

            for (const schemaDir of baseSchemaDirs) {
                const schemaSqlPath = path.join(process.cwd(), 'src', 'lib', schemaDir, 'base_schema.sql');
                console.log(`Initializing database with '${schemaSqlPath}'...`);
                try {
                    const schemaSql = await fs.readFile(schemaSqlPath, 'utf-8');
                    await client.query(schemaSql);
                    console.log(`--- Database initialized successfully using ${schemaDir}/base_schema.sql. ---`);
                } catch (err) {
                    console.error(`Could not read or apply ${schemaDir}/base_schema.sql. Skipping. Error:`, err);
                }
            }
            
        } else {
            console.log("Existing data found. Checking for incremental migrations...");
            const migrationsDir = path.join(process.cwd(), 'src', 'lib', 'migrations');
            const migrationFiles = (await fs.readdir(migrationsDir)).filter(f => f.endsWith('.sql')).sort();

            const appliedMigrationsResult = await client.query('SELECT migration_name FROM schema_migrations');
            const appliedMigrations = new Set(appliedMigrationsResult.rows.map(r => r.migration_name));
            console.log('Already applied migrations:', Array.from(appliedMigrations));

            await client.query('BEGIN');
            try {
                for (const file of migrationFiles) {
                    if (!file.trim()) continue; // Skip empty files
                    const fileContent = await fs.readFile(path.join(migrationsDir, file), 'utf-8');
                    if (!fileContent.trim()) continue; // Skip empty files

                    if (!appliedMigrations.has(file)) {
                        console.log(`--- Applying new migration: ${file} ---`);
                        await client.query(fileContent);
                        await client.query('INSERT INTO schema_migrations (migration_name, sql_script) VALUES ($1, $2)', [file, fileContent]);
                        console.log(`--- Migration '${file}' applied and registered successfully. ---`);
                    }
                }
                await client.query('COMMIT');
                console.log('--- Incremental migration process completed. COMMIT performed. ---');
            } catch(error) {
                 await client.query('ROLLBACK');
                 console.error('Error during migration transaction. ROLLBACK performed.', error);
                 throw error; // Re-throw to be caught by the outer try-catch
            }
        }
    } finally {
        client.release();
        migrationsHaveRun = true;
        console.log("--- Database migration process finished. ---")
    }
}


const JWT_ALG = 'HS256';

type AuthState = {
  success: boolean;
  message: string;
  debugInfo?: string;
};

type CreateAdminState = {
  success: boolean;
  message: string;
}

type AdminSettings = {
    theme: 'light' | 'dark';
    language: 'es' | 'pt';
}

export async function getAdminSettings(): Promise<AdminSettings | null> {
    const session = await getCurrentSession();
    if (!session || session.type !== 'admin') return null;
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const result = await client.query('SELECT theme, language FROM admin_settings WHERE admin_id = $1', [session.id]);
        
        if (result.rows.length > 0) {
            return result.rows[0] as AdminSettings;
        }

        await client.query('INSERT INTO admin_settings (admin_id, theme, language) VALUES ($1, $2, $3) ON CONFLICT (admin_id) DO NOTHING', [session.id, 'light', 'pt']);
        return { theme: 'light', language: 'pt' };

    } catch (error) {
        console.error('Failed to get admin settings:', error);
        return null;
    } finally {
        if (client) client.release();
    }
}

export async function updateAdminSettings(settings: Partial<AdminSettings>): Promise<{success: boolean}> {
    const session = await getCurrentSession();
    if (!session || session.type !== 'admin') return { success: false };

    let client;
    try {
        const pool = await getDbPool();
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
            return { success: true };
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

export async function getSession(sessionToken?: string) {
    if (!sessionToken) return null;

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();

        const { payload } = await jwtVerify(sessionToken, JWT_SECRET, {
            algorithms: [JWT_ALG],
        });
        
        const sessionResult = await client.query(
            'SELECT user_id, user_type FROM sessions WHERE token = $1 AND expires_at > NOW()', 
            [sessionToken]
        );

        if (sessionResult.rows.length === 0) {
            return null; 
        }

        const { user_id, user_type } = sessionResult.rows[0];

        if(user_id !== payload.id || user_type !== payload.type) {
            return null;
        }

        let userResult;
        if (user_type === 'admin') {
             userResult = await client.query('SELECT name, email, can_create_admins FROM admins WHERE id = $1', [user_id]);
        } else if (user_type === 'resident') {
            userResult = await client.query('SELECT name, email FROM residents WHERE id = $1', [user_id]);
        } else if (user_type === 'gatekeeper') {
            userResult = await client.query('SELECT name, email FROM gatekeepers WHERE id = $1', [user_id]);
        } else {
            return null;
        }

        if(!userResult || userResult.rows.length === 0) {
            return null;
        }
        
        const user = userResult.rows[0];

        return {
            id: user_id as string,
            email: user.email as string,
            name: user.name as string,
            type: user_type as 'admin' | 'resident' | 'gatekeeper',
            canCreateAdmins: user.can_create_admins as boolean | undefined,
        };

    } catch (error: any) {
        if (!error.message.includes('Database initialization failed')) {
            console.error('Failed to verify session, possibly malformed or invalid token:', error.message);
        }
        return null;
    } finally {
        if (client) {
            client.release();
        }
    }
}

async function createSession(userId: string, userType: 'admin' | 'resident' | 'gatekeeper') {
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();

        const expirationTime = '1h';
        const expirationDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        const sessionPayload = { id: userId, type: userType };
        
        const token = await new SignJWT(sessionPayload)
          .setProtectedHeader({ alg: JWT_ALG })
          .setIssuedAt()
          .setExpirationTime(expirationTime)
          .sign(JWT_SECRET);
        
        await client.query('DELETE FROM sessions WHERE user_id = $1 AND user_type = $2', [userId, userType]);
        await client.query('INSERT INTO sessions (user_id, user_type, token, expires_at) VALUES ($1, $2, $3, $4)', [userId, userType, token, expirationDate]);

        if(userType === 'admin') {
            await client.query('INSERT INTO admin_settings (admin_id) VALUES ($1) ON CONFLICT (admin_id) DO NOTHING;', [userId]);
        }

        cookies().set('session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60, // 1 hour
            path: '/',
        });

        return { success: true };
    } catch(error) {
        console.error(`Error creating session for ${userType} ${userId}:`, error);
        return { success: false };
    } finally {
        if(client) client.release();
    }
}

export async function authenticateUser(prevState: AuthState | undefined, formData: FormData): Promise<AuthState> {
    let client;
    try {
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const userType = formData.get('user_type') as 'residente' | 'porteria';
        
        if (!email || !password || !userType) {
            return { success: false, message: 'Email, contraseña y tipo de usuario son requeridos.' };
        }

        const pool = await getDbPool();
        client = await pool.connect();
        
        let tableName: string;
        let redirectPath: string;
        let dbUserType: 'resident' | 'gatekeeper';

        if (userType === 'residente') {
            tableName = 'residents';
            redirectPath = '/dashboard';
            dbUserType = 'resident';
        } else if (userType === 'porteria') {
            tableName = 'gatekeepers';
            redirectPath = '/gatekeeper/dashboard'; // Or wherever they should go
            dbUserType = 'gatekeeper';
        } else {
            return { success: false, message: 'Tipo de usuario inválido.' };
        }

        const result = await client.query(`SELECT * FROM ${tableName} WHERE email = $1`, [email]);

        if (result.rows.length === 0) {
          return { success: false, message: 'Credenciales inválidas.' };
        }
        
        const user = result.rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!passwordMatch) {
          return { success: false, message: 'Credenciales inválidas.' };
        }

        const sessionResult = await createSession(user.id, dbUserType);
        if(!sessionResult.success) {
            return { success: false, message: 'Ocurrió un error al iniciar sesión.' };
        }

    } catch (error: any) {
        console.error('Error during user authentication:', error);
        return { 
          success: false, 
          message: 'Ocurrió un error en el servidor.',
          debugInfo: `Error caught: ${error.message}. Stack: ${error.stack}`
        };
    } finally {
        if(client) client.release();
    }

    redirect('/dashboard');
}


export async function authenticateAdmin(prevState: AuthState | undefined, formData: FormData): Promise<AuthState> {
  let client;
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      return { success: false, message: 'Email and password are required.' };
    }
    
    const pool = await getDbPool();
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
    
    const sessionResult = await createSession(admin.id, 'admin');
    if(!sessionResult.success) {
        return { success: false, message: 'An internal server error occurred during session creation.' };
    }
    
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
    redirect('/admin/login');
}
export async function getCurrentSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session');
  return await getSession(sessionToken?.value);
}

export async function createAdmin(prevState: CreateAdminState | undefined, formData: FormData): Promise<CreateAdminState> {
    const session = await getCurrentSession();
    if (!session || !session.canCreateAdmins) {
        return { success: false, message: "No tienes permiso para realizar esta acción." };
    }

    let client;
    try {
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const canCreateAdmins = formData.get('can_create_admins') === 'on';

        if (!name || !email || !password) {
            return { success: false, message: 'Nombre, email y contraseña son obligatorios.' };
        }
        
        const pool = await getDbPool();
        client = await pool.connect();

        const existingAdmin = await client.query('SELECT id FROM admins WHERE email = $1', [email]);
        if (existingAdmin.rows.length > 0) {
            return { success: false, message: 'Ya existe un administrador con este correo electrónico.' };
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await client.query(
            'INSERT INTO admins (name, email, password_hash, can_create_admins) VALUES ($1, $2, $3, $4)',
            [name, email, passwordHash, canCreateAdmins]
        );

        return { success: true, message: `Administrador "${name}" creado con éxito.` };

    } catch (error) {
        console.error('Error creating new admin:', error);
        return { success: false, message: 'Ocurrió un error en el servidor.' };
    } finally {
        if (client) client.release();
    }
}
