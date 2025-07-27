
'use server';

import { redirect } from 'next/navigation'
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { JWT_SECRET } from '@/lib/config';
import fs from 'fs/promises';
import path from 'path';
import nodemailer from 'nodemailer';
import { getSmtpConfigsForMailer } from './smtp';
import es from '@/locales/es.json';
import pt from '@/locales/pt.json';


// --- Database Pool and Migration Logic ---

let pool: Pool | undefined;

// A simple in-memory lock to prevent concurrent migration runs.
// This is crucial for serverless environments where multiple instances can spin up.
let migrationLock: Promise<void> | null = null;


export async function getDbPool(): Promise<Pool> {
    if (pool) {
        return pool;
    }

    // If a migration is already in progress, wait for it to complete.
    if (migrationLock) {
        await migrationLock;
        // After waiting, if the pool is now initialized, return it.
        if (pool) return pool;
    }

    // Start a new migration process, guarded by the lock.
    let releaseLock: () => void;
    let reportError: (err: any) => void;

    migrationLock = new Promise<void>((resolve, reject) => {
        releaseLock = resolve;
        reportError = reject;
    });

    try {
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

        // Run migrations before assigning the pool to the global scope.
        await runMigrations(newPool);

        // Assign the successfully migrated pool.
        pool = newPool;

        // Release the lock to allow other requests to proceed.
        releaseLock!(); 
        
        return pool;
    } catch (error) {
        console.error("CRITICAL: Failed to initialize database connection and run migrations. The application may not function.", error);
        // Report the error to any waiting promises.
        reportError!(error);
        // We re-throw here to ensure that parts of the app that depend on the DB
        // don't proceed in a broken state.
        throw new Error("Database initialization failed.");
    } finally {
        // Ensure the lock is cleared regardless of outcome, allowing future attempts.
        migrationLock = null;
    }
}

async function runMigrations(p: Pool) {
    console.log('--- Starting database migration process ---');
    const client = await p.connect();
    try {
        await client.query('BEGIN');

        // Step 1: Apply all base schemas. `IF NOT EXISTS` makes this safe to run every time.
        console.log("Applying base schemas...");
        const sqlBaseDir = path.join(process.cwd(), 'src', 'lib', 'sql');
        
        // Ensure the base directory for SQL schemas exists
        try {
            await fs.access(sqlBaseDir);
        } catch (error) {
            console.log("No 'src/lib/sql' directory found. Creating it.");
            await fs.mkdir(sqlBaseDir, { recursive: true });
        }

        const schemaDirs = (await fs.readdir(sqlBaseDir, { withFileTypes: true }))
            .filter(dirent => dirent.isDirectory());

        for (const dirent of schemaDirs) {
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
        console.log("--- Database migration process finished. ---")
    }
}


const JWT_ALG = 'HS256';

type AuthState = {
  success: boolean;
  message: string;
  debugInfo?: string;
};

type ActionState = {
  success: boolean;
  message: string;
}

export type Admin = {
    id: string;
    name: string;
    email: string;
    can_create_admins: boolean;
    created_at: string;
};

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

    try {
        const { payload } = await jwtVerify(sessionToken, JWT_SECRET, {
            algorithms: [JWT_ALG],
        });
        
        // Now the payload from the token is trusted.
        // We can use it directly without another DB call in many cases.
        return {
            id: payload.id as string,
            email: payload.email as string,
            name: payload.name as string,
            type: payload.type as 'admin' | 'resident' | 'gatekeeper',
            canCreateAdmins: payload.canCreateAdmins as boolean,
        };
    } catch (error: any) {
        // This will catch expired tokens, invalid signatures, etc.
        // We don't need to log every invalid token attempt.
        if (error.code !== 'ERR_JWT_EXPIRED' && error.code !== 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
           console.error('Error verifying JWT:', error);
        }
        return null;
    }
}

async function createSession(userId: string, userType: 'admin' | 'resident' | 'gatekeeper', userData: {email: string, name: string, canCreateAdmins?: boolean}) {
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();

        const expirationTime = '1h';
        const expirationDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        const sessionPayload = { 
            id: userId, 
            type: userType,
            email: userData.email,
            name: userData.name,
            canCreateAdmins: !!userData.canCreateAdmins
        };
        
        const token = await new SignJWT(sessionPayload)
          .setProtectedHeader({ alg: JWT_ALG })
          .setIssuedAt()
          .setExpirationTime(expirationTime)
          .sign(JWT_SECRET);
        
        // We still store the session in the DB for server-side revocation (logout)
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

        const sessionResult = await createSession(user.id, dbUserType, { email: user.email, name: user.name });
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
    
    const sessionResult = await createSession(admin.id, 'admin', {
        email: admin.email,
        name: admin.name,
        canCreateAdmins: admin.can_create_admins,
    });
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

export async function createAdmin(prevState: ActionState | undefined, formData: FormData): Promise<ActionState> {
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

export async function getAdmins(): Promise<{admins?: Admin[], error?: string}> {
    const session = await getCurrentSession();
    if (!session || session.type !== 'admin') {
        return { error: 'No autorizado.' };
    }

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const result = await client.query('SELECT id, name, email, can_create_admins, created_at FROM admins ORDER BY name');
        return { admins: result.rows };
    } catch (error) {
        console.error('Error fetching admins:', error);
        return { error: 'Error del servidor al obtener administradores.' };
    } finally {
        if (client) client.release();
    }
}

export async function updateAdmin(prevState: ActionState | undefined, formData: FormData): Promise<ActionState> {
    const session = await getCurrentSession();
    if (!session || !session.canCreateAdmins) {
        return { success: false, message: "No tienes permiso para realizar esta acción." };
    }

    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const canCreateAdmins = formData.get('can_create_admins') === 'on';

    if (!id || !name || !email) {
        return { success: false, message: 'ID, Nombre y email son obligatorios.' };
    }
    
    if (id === session.id) {
        return { success: false, message: "No puedes editar tu propia cuenta desde esta pantalla. Usa la opción 'Mi Cuenta'." };
    }

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();

        // Check for email conflict
        const existingAdmin = await client.query('SELECT id FROM admins WHERE email = $1 AND id != $2', [email, id]);
        if (existingAdmin.rows.length > 0) {
            return { success: false, message: 'Ya existe otro administrador con este correo electrónico.' };
        }

        await client.query(
            'UPDATE admins SET name = $1, email = $2, can_create_admins = $3, updated_at = NOW() WHERE id = $4',
            [name, email, canCreateAdmins, id]
        );

        return { success: true, message: 'Administrador actualizado con éxito.' };
    } catch (error) {
        console.error('Error updating admin:', error);
        return { success: false, message: 'Ocurrió un error en el servidor.' };
    } finally {
        if (client) client.release();
    }
}


export async function deleteAdmin(id: string): Promise<ActionState> {
    const session = await getCurrentSession();
    if (!session || !session.canCreateAdmins) {
        return { success: false, message: "No tienes permiso para realizar esta acción." };
    }
    
    if (id === session.id) {
        return { success: false, message: "No puedes eliminar tu propia cuenta de administrador." };
    }

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const result = await client.query('DELETE FROM admins WHERE id = $1', [id]);
        
        if (result.rowCount === 0) {
            return { success: false, message: 'No se encontró el administrador para eliminar.' };
        }
        
        return { success: true, message: 'Administrador eliminado con éxito.' };
    } catch (error) {
        console.error('Error deleting admin:', error);
        return { success: false, message: 'Ocurrió un error en el servidor.' };
    } finally {
        if (client) client.release();
    }
}

async function sendEmail(to: string, subject: string, html: string): Promise<{success: boolean, message: string}> {
    const smtpConfigs = await getSmtpConfigsForMailer();

    if (smtpConfigs.length === 0) {
        console.error("No SMTP configurations found in the database.");
        return { success: false, message: 'No hay configuraciones SMTP disponibles para enviar correos.' };
    }

    for (const config of smtpConfigs) {
        try {
            const transporter = nodemailer.createTransport({
                host: config.host,
                port: config.port,
                secure: config.secure,
                auth: {
                    user: config.auth_user,
                    pass: config.auth_pass, // Note: This should be the decrypted password
                },
            });

            const info = await transporter.sendMail({
                from: `"${config.name}" <${config.auth_user}>`,
                to: to,
                subject: subject,
                html: html,
            });

            console.log(`Message sent successfully with config "${config.name}": %s`, info.messageId);
            return { success: true, message: 'Correo enviado con éxito.' };

        } catch (error) {
            console.error(`Failed to send email with config "${config.name}". Error: ${error}`);
            // If it fails, the loop will continue to the next configuration
        }
    }

    // If all configurations fail
    console.error("All SMTP configurations failed.");
    return { success: false, message: 'Error del servidor: Todos los proveedores de correo fallaron.' };
}


function generateTempPassword(): string {
    // Generate a random 8-character password
    return Math.random().toString(36).slice(-8);
}


export async function sendAdminCredentialsEmail(adminId: string, appUrl: string): Promise<ActionState> {
     const session = await getCurrentSession();
    if (!session || !session.canCreateAdmins) {
        return { success: false, message: "No tienes permiso para realizar esta acción." };
    }

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        
        const adminResult = await client.query(
          'SELECT a.name, a.email, s.language FROM admins a LEFT JOIN admin_settings s ON a.id = s.admin_id WHERE a.id = $1',
          [adminId]
        );
        if (adminResult.rows.length === 0) {
            return { success: false, message: 'Administrador no encontrado.' };
        }
        const admin = adminResult.rows[0];
        const locale = admin.language === 'es' ? 'es' : 'pt';
        const t = locale === 'es' ? es : pt;

        
        const tempPassword = generateTempPassword();
        const passwordHash = await bcrypt.hash(tempPassword, 10);
        
        await client.query('UPDATE admins SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, adminId]);
        
        const adminLoginUrl = new URL('/admin/login', appUrl).toString();
        
        const emailHtml = `
            <h1>${t.emails.adminCredentials.title}</h1>
            <p>${t.emails.adminCredentials.hello}, ${admin.name},</p>
            <p>${t.emails.adminCredentials.intro}</p>
            <ul>
                <li><strong>URL:</strong> <a href="${adminLoginUrl}">${adminLoginUrl}</a></li>
                <li><strong>Email:</strong> ${admin.email}</li>
                <li><strong>${t.emails.adminCredentials.passwordLabel}:</strong> ${tempPassword}</li>
            </ul>
            <p>${t.emails.adminCredentials.changePasswordPrompt}</p>
            <p>${t.emails.adminCredentials.thanks}<br/>${t.emails.adminCredentials.teamName}</p>
        `;

        return await sendEmail(admin.email, t.emails.adminCredentials.subject, emailHtml);
        
    } catch(error) {
        console.error("Error sending admin credentials email:", error);
        return { success: false, message: "Error del servidor al enviar el correo." }
    } finally {
        if(client) client.release();
    }
}

// --- Account Management ---

function generateVerificationPin(): string {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit PIN
}

export async function sendEmailChangePin(newEmail: string): Promise<ActionState> {
    const session = await getCurrentSession();
    if (!session || session.type !== 'admin') {
        return { success: false, message: "No autorizado." };
    }

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();

        const existingAdmin = await client.query('SELECT id FROM admins WHERE email = $1', [newEmail]);
        if (existingAdmin.rows.length > 0) {
            return { success: false, message: 'Este correo electrónico ya está en uso.' };
        }
        
        const pin = generateVerificationPin();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        await client.query(
            'INSERT INTO admin_verification_pins (admin_id, pin, email, expires_at) VALUES ($1, $2, $3, $4) ON CONFLICT (admin_id) DO UPDATE SET pin = $2, email = $3, expires_at = $4',
            [session.id, pin, newEmail, expiresAt]
        );

        const emailHtml = `
            <h1>Verifica tu nuevo correo electrónico</h1>
            <p>Hola ${session.name},</p>
            <p>Has solicitado cambiar tu correo electrónico en Follow For Me a esta dirección.</p>
            <p>Para confirmar el cambio, usa el siguiente PIN de verificación:</p>
            <h2>${pin}</h2>
            <p>Este PIN expirará en 10 minutos.</p>
        `;

        return await sendEmail(newEmail, 'Tu PIN de Verificación de Follow For Me', emailHtml);

    } catch (error) {
        console.error("Error sending verification PIN:", error);
        return { success: false, message: "Error del servidor al enviar el PIN." };
    } finally {
        if (client) client.release();
    }
}

export async function updateAdminAccount(prevState: any, formData: FormData): Promise<ActionState> {
    const session = await getCurrentSession();
    if (!session || session.type !== 'admin') {
        return { success: false, message: "No autorizado." };
    }

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();

        // Get current admin data
        const adminResult = await client.query('SELECT * FROM admins WHERE id = $1', [session.id]);
        if (adminResult.rows.length === 0) {
            return { success: false, message: "No se encontró la cuenta de administrador." };
        }
        const currentAdmin = adminResult.rows[0];

        // --- Handle Profile Update ---
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const emailPin = formData.get('email_pin') as string;
        
        const updateClauses = [];
        const values = [];
        let valueIndex = 1;

        if (name && name !== currentAdmin.name) {
            updateClauses.push(`name = $${valueIndex++}`);
            values.push(name);
        }

        if (email && email !== currentAdmin.email) {
            if (!emailPin) {
                return { success: false, message: "Se requiere un PIN para cambiar el correo electrónico." };
            }

            const pinResult = await client.query(
                'SELECT * FROM admin_verification_pins WHERE admin_id = $1 AND email = $2 AND pin = $3 AND expires_at > NOW()',
                [session.id, email, emailPin]
            );

            if (pinResult.rows.length === 0) {
                return { success: false, message: "PIN inválido o expirado." };
            }
            
            // Check if new email is already taken by someone else
            const existingAdmin = await client.query('SELECT id FROM admins WHERE email = $1 AND id != $2', [email, session.id]);
            if (existingAdmin.rows.length > 0) {
                return { success: false, message: 'El nuevo correo electrónico ya está en uso.' };
            }

            updateClauses.push(`email = $${valueIndex++}`);
            values.push(email);

            // Invalidate the PIN after use
            await client.query('DELETE FROM admin_verification_pins WHERE admin_id = $1', [session.id]);
        }
        
        if (updateClauses.length > 0) {
             updateClauses.push(`updated_at = NOW()`);
             values.push(session.id);
             const query = `UPDATE admins SET ${updateClauses.join(', ')} WHERE id = $${valueIndex}`;
             await client.query(query, values);
        }
        
        // --- Handle Password Update ---
        const currentPassword = formData.get('current_password') as string;
        const newPassword = formData.get('new_password') as string;
        const confirmPassword = formData.get('confirm_password') as string;

        if (currentPassword || newPassword || confirmPassword) {
            if (!currentPassword || !newPassword || !confirmPassword) {
                return { success: false, message: "Por favor, completa todos los campos de contraseña." };
            }
            if (newPassword !== confirmPassword) {
                return { success: false, message: "Las nuevas contraseñas no coinciden." };
            }

            const passwordMatch = await bcrypt.compare(currentPassword, currentAdmin.password_hash);
            if (!passwordMatch) {
                return { success: false, message: "La contraseña actual es incorrecta." };
            }

            const newPasswordHash = await bcrypt.hash(newPassword, 10);
            await client.query('UPDATE admins SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newPasswordHash, session.id]);
        }
        
        if (updateClauses.length > 0 || (newPassword && newPassword === confirmPassword)) {
            // If email was changed, we need to re-issue the session token with the new email
            if (email && email !== currentAdmin.email) {
                await createSession(session.id, 'admin', {
                    email: email,
                    name: name || currentAdmin.name,
                    canCreateAdmins: currentAdmin.can_create_admins,
                });
                 return { success: true, message: "Cuenta actualizada. Se cerrará la sesión para aplicar el cambio de correo." };
            }
             return { success: true, message: "Cuenta actualizada exitosamente." };
        }

        return { success: false, message: "No se realizaron cambios." };
        
    } catch (error) {
        console.error("Error updating admin account:", error);
        return { success: false, message: "Error del servidor." };
    } finally {
        if (client) client.release();
    }
}
    

    

    

    
