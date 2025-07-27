
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

export async function getDbPool(): Promise<Pool> {
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
        await client.query('BEGIN');

        // Step 1: Apply all base schemas. `IF NOT EXISTS` makes this safe to run every time.
        console.log("Applying base schemas...");
        const sqlBaseDir = path.join(process.cwd(), 'src', 'lib', 'sql');
        const schemaDirs = await fs.readdir(sqlBaseDir, { withFileTypes: true });

        for (const dirent of schemaDirs) {
            if (dirent.isDirectory()) {
                const schemaSqlPath = path.join(sqlBaseDir, dirent.name, 'base_schema.sql');
                try {
                    // Check if base_schema.sql exists before trying to read it
                    await fs.access(schemaSqlPath); 
                    
                    const schemaSql = await fs.readFile(schemaSqlPath, 'utf-8');
                    if (schemaSql.trim()) {
                        console.log(`- Applying base schema from '${dirent.name}/base_schema.sql'...`);
                        await client.query(schemaSql);
                    }
                } catch (err: any) {
                    // This will now only catch errors other than file-not-found, 
                    // as we're checking for existence first. We'll log it for debugging.
                    if (err.code !== 'ENOENT') {
                       console.warn(`Could not process schema in '${dirent.name}'. Error: ${err.message}`);
                       throw err; // Re-throw critical SQL errors
                    }
                    // If ENOENT, we just skip, which is the intended behavior.
                }
            }
        }
        console.log("--- Base schema application complete. ---");

        // Step 2: Ensure the migrations table exists.
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                migration_name VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMPTZ DEFAULT NOW(),
                sql_script TEXT
            );
        `);

        // Step 3: Check for and apply incremental migrations.
        console.log("Checking for incremental migrations...");
        const migrationsDir = path.join(process.cwd(), 'src', 'lib', 'migrations');
        // Ensure migrations directory exists before trying to read it
        try {
            await fs.access(migrationsDir);
        } catch (error) {
            console.log("No 'migrations' directory found. Creating it.");
            await fs.mkdir(migrationsDir);
        }

        const migrationFiles = (await fs.readdir(migrationsDir)).filter(f => f.endsWith('.sql')).sort();

        const appliedMigrationsResult = await client.query('SELECT migration_name FROM schema_migrations');
        const appliedMigrations = new Set(appliedMigrationsResult.rows.map(r => r.migration_name));
        console.log('Already applied migrations:', Array.from(appliedMigrations));

        for (const file of migrationFiles) {
            if (!file.trim() || appliedMigrations.has(file)) continue;

            const fileContent = await fs.readFile(path.join(migrationsDir, file), 'utf-8');
            if (!fileContent.trim()) continue;

            console.log(`--- Applying new incremental migration: ${file} ---`);
            await client.query(fileContent);
            await client.query('INSERT INTO schema_migrations (migration_name, sql_script) VALUES ($1, $2)', [file, fileContent]);
            console.log(`--- Migration '${file}' applied and registered successfully. ---`);
        }
        
        await client.query('COMMIT');
        console.log('--- Migration process completed. COMMIT performed. ---');

    } catch(error) {
         await client.query('ROLLBACK');
         console.error('Error during migration transaction. ROLLBACK performed.', error);
         throw error; // Re-throw to be caught by the outer try-catch
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

type UserSettings = {
    theme: 'light' | 'dark';
    language: 'es' | 'pt';
}

// Generic settings functions
export async function getSettings(): Promise<UserSettings | null> {
    const session = await getCurrentSession();
    if (!session) return null;
    
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        
        const tableName = `${session.type}_settings`;
        const userIdColumn = `${session.type}_id`;

        const result = await client.query(`SELECT theme, language FROM ${tableName} WHERE ${userIdColumn} = $1`, [session.id]);
        
        if (result.rows.length > 0) {
            return result.rows[0] as UserSettings;
        }

        // This case should ideally not happen if createSession works correctly, but it's a good fallback.
        const defaultSettings: UserSettings = { theme: 'light', language: 'pt' };
        await client.query(`INSERT INTO ${tableName} (${userIdColumn}, theme, language) VALUES ($1, $2, $3) ON CONFLICT (${userIdColumn}) DO NOTHING`, [session.id, defaultSettings.theme, defaultSettings.language]);
        return defaultSettings;

    } catch (error) {
        console.error(`Failed to get settings for ${session.type} ${session.id}:`, error);
        return null;
    } finally {
        if (client) client.release();
    }
}

export async function updateSettings(settings: Partial<UserSettings>): Promise<{success: boolean}> {
    const session = await getCurrentSession();
    if (!session) return { success: false };

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();

        const tableName = `${session.type}_settings`;
        const userIdColumn = `${session.type}_id`;

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
        const query = `UPDATE ${tableName} SET ${setClauses.join(', ')}, updated_at = NOW() WHERE ${userIdColumn} = $${valueIndex}`;
        
        await client.query(query, values);
        
        return { success: true };
    } catch (error) {
        console.error(`Failed to update settings for ${session.type} ${session.id}:`, error);
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
        
        const sessionResult = await client.query(
            'SELECT user_id, user_type FROM sessions WHERE token = $1 AND expires_at > NOW()', 
            [sessionToken]
        );

        if (sessionResult.rows.length === 0) {
            return null; 
        }

        const { user_id, user_type } = sessionResult.rows[0];

        let userResult;
        if (user_type === 'admin') {
             userResult = await client.query('SELECT * FROM admins WHERE id = $1', [user_id]);
        } else if (user_type === 'resident') {
            userResult = await client.query('SELECT * FROM residents WHERE id = $1', [user_id]);
        } else if (user_type === 'gatekeeper') {
            userResult = await client.query('SELECT * FROM gatekeepers WHERE id = $1', [user_id]);
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

        const settingsTable = `${userType}_settings`;
        const userIdColumn = `${userType}_id`;
        await client.query(`INSERT INTO ${settingsTable} (${userIdColumn}) VALUES ($1) ON CONFLICT (${userIdColumn}) DO NOTHING;`, [userId]);

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
    redirect('/');
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

    
