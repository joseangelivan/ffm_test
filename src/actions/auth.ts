
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

let migrationsHaveRun = false;

/**
 * Migration Runner.
 * Ensures the database schema is up to date.
 * If the migrations table doesn't exist, it assumes a fresh database
 * and initializes it using the consolidated schema.sql.
 * Otherwise, it applies pending migrations from the src/lib/migrations directory.
 */
export async function runMigrations() {
    if (migrationsHaveRun) {
        console.log("Las migraciones ya se ejecutaron en este ciclo de vida del servidor. Omitiendo.");
        return;
    }
    
    console.log('--- Iniciando el proceso de migraciones de base de datos ---');
    const client = await pool.connect();
    try {
        let migrationsTableExists = false;
        try {
            await client.query('SELECT 1 FROM schema_migrations LIMIT 1');
            migrationsTableExists = true;
        } catch (e) {
            migrationsTableExists = false;
        }

        if (!migrationsTableExists) {
            console.log("La tabla 'schema_migrations' no existe. Se asume una base de datos nueva.");
            console.log("Inicializando la base de datos con 'src/lib/schema.sql'...");
            
            try {
                const schemaSqlPath = path.join(process.cwd(), 'src', 'lib', 'schema.sql');
                const schemaSql = await fs.readFile(schemaSqlPath, 'utf-8');
                
                await client.query(schemaSql);
                
                console.log('--- Base de datos inicializada con éxito usando schema.sql. ---');
            } catch (schemaError) {
                console.error('Error crítico al inicializar la base de datos con schema.sql:', schemaError);
                // We should re-throw here or handle it appropriately to prevent app from starting with a broken DB state
                throw schemaError;
            }
            // Skip incremental migrations as the schema is now considered up-to-date
            migrationsHaveRun = true;
            return; 
        }

        // --- Proceed with incremental migrations if migrations table exists ---
        console.log("La tabla 'schema_migrations' existe. Buscando migraciones incrementales...");
        const migrationsDir = path.join(process.cwd(), 'src', 'lib', 'migrations');
        const migrationFiles = (await fs.readdir(migrationsDir)).filter(f => f.endsWith('.sql')).sort();

        const appliedMigrationsResult = await client.query('SELECT migration_name FROM schema_migrations');
        const appliedMigrations = new Set(appliedMigrationsResult.rows.map(r => r.migration_name));
        console.log('Migraciones ya aplicadas:', Array.from(appliedMigrations));

        await client.query('BEGIN');
        try {
            for (const file of migrationFiles) {
                if (!appliedMigrations.has(file)) {
                    console.log(`--- Aplicando nueva migración: ${file} ---`);
                    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf-8');
                    
                    await client.query(sql);
                    console.log(`Respuesta de la BD para '${file}': Ejecución completada.`);
                    
                    await client.query('INSERT INTO schema_migrations (migration_name, sql_script) VALUES ($1, $2)', [file, sql]);
                    console.log(`Respuesta de la BD para '${file}': Migración registrada en 'schema_migrations'.`);
                    console.log(`--- Migración '${file}' aplicada y registrada con éxito. ---`);
                }
            }
            await client.query('COMMIT');
            console.log('--- Proceso de migraciones incrementales completado. COMMIT realizado. ---');
        } catch(error) {
             await client.query('ROLLBACK');
             console.error('Error durante la transacción de migración. Se ha hecho ROLLBACK.', error);
             // Do not re-throw, as it could prevent the app from starting.
        }

    } catch (error) {
        console.error('Error durante el proceso de migración.', error);
        // Do not re-throw, as it could prevent the app from starting.
    } finally {
        client.release();
        migrationsHaveRun = true;
    }
}

// Run migrations on server startup.
runMigrations().catch(e => {
    console.error("Error crítico durante la ejecución inicial de migraciones. La aplicación puede no funcionar correctamente.", e);
});


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
    if (!session) return null;

    let client;
    try {
        client = await pool.connect();
        const result = await client.query('SELECT theme, language FROM admin_settings WHERE admin_id = $1', [session.id]);
        
        if (result.rows.length > 0) {
            return result.rows[0] as AdminSettings;
        }

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
    const session = await getCurrentSession();
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

        const adminResult = await client.query('SELECT name, email, can_create_admins FROM admins WHERE id = $1', [payload.id]);
        if(adminResult.rows.length === 0) {
            return null;
        }
        
        const admin = adminResult.rows[0];

        return {
            id: payload.id as string,
            email: admin.email as string,
            name: admin.name as string,
            canCreateAdmins: admin.can_create_admins as boolean,
        };

    } catch (error: any) {
        console.error('Failed to verify session, possibly malformed or invalid token:', error.message);
        return null;
    } finally {
        if (client) {
            client.release();
        }
    }
}


export async function authenticateAdmin(prevState: AuthState | undefined, formData: FormData): Promise<AuthState> {
  let client;
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      return { success: false, message: 'Email and password are required.' };
    }

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
    
    await client.query('DELETE FROM sessions WHERE admin_id = $1', [admin.id]);
    await client.query('INSERT INTO sessions (admin_id, token, expires_at) VALUES ($1, $2, $3)', [admin.id, token, expirationDate]);
    await client.query('INSERT INTO admin_settings (admin_id) VALUES ($1) ON CONFLICT (admin_id) DO NOTHING;', [admin.id]);

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

export async function handleLogoutAction() {
    const sessionCookie = await cookies().get('session');
    if (sessionCookie) {
        let client;
        try {
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
