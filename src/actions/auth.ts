
'use server';

import { redirect } from 'next/navigation'
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { JWT_SECRET } from '@/lib/config';
import nodemailer from 'nodemailer';
import { getSmtpConfigsForMailer } from './smtp';
import es from '@/locales/es.json';
import pt from '@/locales/pt.json';
import fs from 'fs/promises';
import path from 'path';
import { getAppSetting } from './settings';
import { authenticator } from 'otplib';


// --- Database Pool and Migration Logic ---

let pool: Pool | undefined;
let migrationsRan = false;

async function runMigrations(client: Pool) {
    if (migrationsRan) return;
    console.log('[runMigrations] Starting migration process...');
    const dbClient = await client.connect();
    try {
        await dbClient.query('BEGIN');
        
        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS migrations_log (
                id SERIAL PRIMARY KEY,
                file_name VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        
        const schemasToApply = [
            'admins/base_schema.sql',
            'condominiums/base_schema.sql',
            'settings/base_schema.sql',
            'residents/base_schema.sql',
            'gatekeepers/base_schema.sql',
            'entry_control/base_schema.sql',
        ];
        
        for (const schemaFile of schemasToApply) {
            const checkMigration = await dbClient.query('SELECT 1 FROM migrations_log WHERE file_name = $1', [schemaFile]);
            
            if (checkMigration.rows.length > 0) {
                console.log(`[runMigrations] Migration already applied, skipping: ${schemaFile}`);
                continue; 
            }
            console.log(`[runMigrations] Applying migration: ${schemaFile}`);
            
            const sqlPath = path.join(process.cwd(), 'src', 'lib', 'sql', schemaFile);
            let schemaSql = await fs.readFile(sqlPath, 'utf-8');

            if (schemaSql.trim()) {
                const createTypeRegex = /(CREATE TYPE "([^"]+)" AS ENUM \([^)]+\);)/gi;
                let match;
                while ((match = createTypeRegex.exec(schemaSql)) !== null) {
                    const fullMatch = match[1];
                    const typeName = match[2];
                    const safeBlock = `
                        DO $$
                        BEGIN
                            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${typeName}') THEN
                                ${fullMatch}
                            END IF;
                        END$$;
                    `;
                    schemaSql = schemaSql.replace(fullMatch, safeBlock);
                }
                
                await dbClient.query(schemaSql);
                await dbClient.query('INSERT INTO migrations_log (file_name) VALUES ($1)', [schemaFile]);
            }
        }

        await dbClient.query('COMMIT');
        migrationsRan = true;
        console.log('[runMigrations] Migration process completed successfully.');
    } catch(error) {
         console.error('[runMigrations] Error during migration transaction. Attempting ROLLBACK.', error);
         await dbClient.query('ROLLBACK');
         throw error;
    } finally {
        dbClient.release();
    }
}

export async function getDbPool(forceMigration = false): Promise<Pool> {
    if (!pool) {
        try {
            console.log('[getDbPool] Initializing database pool...');
            pool = new Pool({
                connectionString: process.env.DATABASE_URL || 'postgresql://postgres:vxLaQxZOIeZNIIvCvjXEXYEhRAMmiUTT@mainline.proxy.rlwy.net:38539/railway',
            });
            await pool.query('SELECT NOW()'); // Test connection
            console.log('[getDbPool] Database pool initialized successfully.');
        } catch (error) {
            console.error("CRITICAL: Failed during database pool initialization.", error);
            pool = undefined; // Ensure pool is not left in a bad state
            throw new Error("Database initialization failed.");
        }
    }
    
    if (forceMigration) {
        await runMigrations(pool);
    }
    
    return pool;
}


const JWT_ALG = 'HS256';

type AuthState = {
  success: boolean;
  message: string;
  action?: 'redirect_first_login' | 'redirect_enter_password' | 'redirect_2fa';
  data?: {
    email?: string;
  }
};

type ActionState = {
  success: boolean;
  message: string;
  data?: {
      needsLogout?: boolean;
      emailFailed?: boolean;
      qrCodeUrl?: string;
      secret?: string;
  }
};

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
        
        const tableName = `admin_settings`;
        const userIdColumn = `admin_id`;

        const result = await client.query(`SELECT theme, language FROM ${tableName} WHERE ${userIdColumn} = $1`, [session.id]);
        
        if (result.rows.length > 0) {
            return result.rows[0] as UserSettings;
        }

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

        const tableName = `admin_settings`;
        const userIdColumn = `admin_id`;

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
        
        return {
            id: payload.id as string,
            email: payload.email as string,
            name: payload.name as string,
            type: payload.type as 'admin' | 'resident' | 'gatekeeper',
            canCreateAdmins: payload.canCreateAdmins as boolean,
        };
    } catch (error: any) {
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
        
        await client.query(`DELETE FROM sessions WHERE user_id = $1 AND user_type = $2`, [userId, userType]);
        await client.query('INSERT INTO sessions (user_id, user_type, token, expires_at) VALUES ($1, $2, $3, $4)', [userId, userType, token, expirationDate]);

        if (userType === 'admin') {
            const settingsTable = `admin_settings`;
            const userIdColumn = `admin_id`;
            await client.query(`INSERT INTO ${settingsTable} (${userIdColumn}) VALUES ($1) ON CONFLICT (${userIdColumn}) DO NOTHING;`, [userId]);
        }
        
        const cookieStore = cookies();
        cookieStore.set('session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60, // 1 hour
            path: '/',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        });

        return { success: true };
    } catch(error) {
        console.error(`Error creating session for ${userType} ${userId}:`, error);
        return { success: false };
    } finally {
        if(client) client.release();
    }
}

export async function authenticateUser(prevState: any, formData: FormData): Promise<AuthState> {
    let client;
    try {
        const pool = await getDbPool();
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const userType = formData.get('user_type') as 'residente' | 'porteria';
        
        if (!email || !password || !userType) {
            return { success: false, message: 'Email, contraseña y tipo de usuario son requeridos.' };
        }

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
            redirectPath = '/gatekeeper/dashboard';
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
        };
    } finally {
        if(client) client.release();
    }

    redirect('/dashboard');
}


export async function checkAdminEmail(prevState: any, formData: FormData): Promise<AuthState> {
    const email = formData.get('email') as string;
    if (!email) {
        return { success: false, message: "toast.adminLogin.missingCredentials" };
    }

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const result = await client.query('SELECT a.*, s.secret IS NOT NULL as has_totp FROM admins a LEFT JOIN admin_totp_secrets s ON a.id = s.admin_id WHERE a.email = $1', [email]);
        
        if (result.rows.length === 0) {
            return { success: false, message: "toast.adminLogin.invalidUser" };
        }
        const admin = result.rows[0];

        if (admin.password_hash === null) {
            return { success: true, message: "Redireccionando a primer login", action: 'redirect_first_login', data: { email } };
        }

        if (admin.has_totp) {
            return { success: true, message: "Redireccionando a 2FA", action: 'redirect_2fa', data: { email } };
        }

        return { success: true, message: "Redireccionando a contraseña", action: 'redirect_enter_password', data: { email } };

    } catch (error) {
        console.error('Error checking admin email:', error);
        return { success: false, message: "toast.adminLogin.serverError" };
    } finally {
        if (client) client.release();
    }
}


export async function authenticateAdmin(prevState: any, formData: FormData): Promise<ActionState> {
  let client;
  try {
    const pool = await getDbPool();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      return { success: false, message: "toast.adminLogin.missingCredentials" };
    }
    
    client = await pool.connect();
    const result = await client.query('SELECT * FROM admins WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return { success: false, message: "toast.adminLogin.invalidCredentials" };
    }
    const admin = result.rows[0];
    
    const passwordMatch = await bcrypt.compare(password, admin.password_hash);
    if (!passwordMatch) {
      return { success: false, message: "toast.adminLogin.invalidCredentials" };
    }
    
    const sessionResult = await createSession(admin.id, 'admin', {
        email: admin.email,
        name: admin.name,
        canCreateAdmins: admin.can_create_admins,
    });

    if(!sessionResult.success) {
        return { success: false, message: "toast.adminLogin.sessionError" };
    }
    
  } catch (error: any) {
    console.error('Error during authentication:', error);
    return { success: false, message: "toast.adminLogin.serverError" };
  } finally {
    if (client) client.release();
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
        const canCreateAdmins = formData.get('can_create_admins') === 'on';
        const pin = formData.get('pin') as string;
        const locale = formData.get('locale') as 'es' | 'pt' || 'pt';

        if (!name || !email) {
            return { success: false, message: 'Nombre y email son obligatorios.' };
        }
        if (!pin || !/^\d{6}$/.test(pin)) {
            return { success: false, message: 'El PIN debe ser un número de 6 dígitos.' };
        }
        
        const pool = await getDbPool();
        client = await pool.connect();
        
        await client.query('BEGIN');

        const existingAdmin = await client.query('SELECT id FROM admins WHERE email = $1', [email]);
        if (existingAdmin.rows.length > 0) {
            await client.query('ROLLBACK');
            return { success: false, message: 'Ya existe un administrador con este correo electrónico.' };
        }

        const newAdminResult = await client.query(
            'INSERT INTO admins (name, email, password_hash, can_create_admins) VALUES ($1, $2, NULL, $3) RETURNING id',
            [name, email, canCreateAdmins]
        );
        const newAdminId = newAdminResult.rows[0].id;
        
        const pinHash = await bcrypt.hash(pin, 10);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await client.query(
          'INSERT INTO admin_first_login_pins (admin_id, pin_hash, expires_at) VALUES ($1, $2, $3)',
          [newAdminId, pinHash, expiresAt]
        );
        
        await client.query('COMMIT');
        
        const emailResult = await sendAdminFirstLoginEmail({ name, email, language: locale });

        if (!emailResult.success) {
            return { 
                success: true,
                message: `Administrador "${name}" creado, pero falló el envío del correo de activación. Por favor, reenvíelo manualmente.`,
                data: { emailFailed: true }
            };
        }
        
        return { success: true, message: `Administrador "${name}" creado. Se ha enviado un correo de activación.` };

    } catch (error) {
        if(client) await client.query('ROLLBACK');
        console.error('Error creating new admin:', error);
        return { success: false, message: 'Ocurrió un error en el servidor.' };
    } finally {
        if (client) client.release();
    }
}

export async function getAdmins(): Promise<{admins?: Admin[], error?: string}> {
    const session = await getCurrentSession();
    if (!session || session.type !== 'admin') {
        return { error: "No autorizado." };
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
                    pass: config.auth_pass,
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
        }
    }

    console.error("All SMTP configurations failed.");
    return { success: false, message: 'Error del servidor: Todos los proveedores de correo fallaron.' };
}

export async function sendAdminFirstLoginEmail({ name, email, language = 'pt' }: { name: string, email: string, language?: 'es' | 'pt'}): Promise<ActionState> {
    try {
        const appDomain = await getAppSetting('app_domain');
        const appUrl = appDomain || 'http://localhost:9003';
        
        const t = language === 'es' ? es : pt;
        const firstLoginUrl = new URL('/admin/first-login', appUrl).toString();
        
        const emailHtml = `
            <h1>${t.emails.adminFirstLogin.title}</h1>
            <p>${t.emails.adminFirstLogin.hello}, ${name},</p>
            <p>${t.emails.adminFirstLogin.intro}</p>
            <p>${t.emails.adminFirstLogin.pinInfo}</p>
            <ul>
                <li><strong>URL de Activación:</strong> <a href="${firstLoginUrl}">${firstLoginUrl}</a></li>
                <li><strong>Email:</strong> ${email}</li>
            </ul>
            <p>${t.emails.adminFirstLogin.thanks}<br/>${t.emails.adminFirstLogin.teamName}</p>
        `;

        return await sendEmail(email, t.emails.adminFirstLogin.subject, emailHtml);
        
    } catch(error) {
        console.error("Error sending admin first login email:", error);
        return { success: false, message: "Error del servidor al enviar el correo." }
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

        const existingAdmin = await client.query('SELECT id FROM admins WHERE email = $1 AND id != $2', [newEmail, session.id]);
        if (existingAdmin.rows.length > 0) {
            return { success: false, message: 'Este correo electrónico ya está en uso.' };
        }
        
        const pin = generateVerificationPin();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        await client.query(
            'INSERT INTO admin_verification_pins (admin_id, pin, email, expires_at) VALUES ($1, $2, $3, $4) ON CONFLICT (admin_id) DO UPDATE SET pin = $2, email = $3, expires_at = $4',
            [session.id, pin, newEmail, expiresAt]
        );
        
        const settingsResult = await client.query('SELECT language FROM admin_settings WHERE admin_id = $1', [session.id]);
        const locale = settingsResult.rows[0]?.language === 'es' ? 'es' : 'pt';
        const t = locale === 'es' ? es : pt;
        
        const emailHtml = `
            <h1>${t.emails.verifyNewEmail.title}</h1>
            <p>${t.emails.verifyNewEmail.hello}, ${session.name},</p>
            <p>${t.emails.verifyNewEmail.intro}</p>
            <p>${t.emails.verifyNewEmail.pinPrompt}</p>
            <h2>${pin}</h2>
            <p>${t.emails.verifyNewEmail.expiration}</p>
            <p>${t.emails.verifyNewEmail.thanks}</p>
        `;

        return await sendEmail(newEmail, t.emails.verifyNewEmail.subject, emailHtml);

    } catch (error) {
        console.error("Error sending verification PIN:", error);
        return { success: false, message: "Error del servidor al enviar el PIN." };
    } finally {
        if (client) client.release();
    }
}

export async function verifyAdminEmailChangePin(newEmail: string, pin: string): Promise<ActionState> {
    const session = await getCurrentSession();
    if (!session || session.type !== 'admin') {
        return { success: false, message: "No autorizado." };
    }

    if (!newEmail || !pin) {
        return { success: false, message: "Faltan el correo electrónico o el PIN." };
    }

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        
        const pinResult = await client.query(
            'SELECT * FROM admin_verification_pins WHERE admin_id = $1 AND email = $2 AND pin = $3 AND expires_at > NOW()',
            [session.id, newEmail, pin]
        );

        if (pinResult.rows.length === 0) {
            return { success: false, message: "PIN inválido o expirado." };
        }
        
        await client.query('DELETE FROM admin_verification_pins WHERE admin_id = $1', [session.id]);

        return { success: true, message: "PIN verificado con éxito." };
    } catch (error) {
        console.error("Error verifying email change PIN:", error);
        return { success: false, message: "Error del servidor." };
    } finally {
        if (client) client.release();
    }
}

export async function updateAdminAccount(prevState: any, formData: FormData): Promise<ActionState> {
    const session = await getCurrentSession();
    if (!session || session.type !== 'admin') {
        return { success: false, message: "No autorizado." };
    }

    const locale = formData.get('locale') as 'es' | 'pt' || 'pt';
    const t = locale === 'es' ? es : pt;

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();

        const adminResult = await client.query('SELECT * FROM admins WHERE id = $1', [session.id]);
        if (adminResult.rows.length === 0) {
            return { success: false, message: "No se encontró la cuenta de administrador." };
        }
        const currentAdmin = adminResult.rows[0];

        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        
        const updateClauses: string[] = [];
        const values: any[] = [];
        let valueIndex = 1;

        if (name && name !== currentAdmin.name) {
            updateClauses.push(`name = $${valueIndex++}`);
            values.push(name);
        }

        if (email && email !== currentAdmin.email) {
            const existingAdmin = await client.query('SELECT id FROM admins WHERE email = $1 AND id != $2', [email, session.id]);
            if (existingAdmin.rows.length > 0) {
                return { success: false, message: 'El nuevo correo electrónico ya está en uso.' };
            }
            updateClauses.push(`email = $${valueIndex++}`);
            values.push(email);
        }
        
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
            updateClauses.push(`password_hash = $${valueIndex++}`);
            values.push(newPasswordHash);
        }

        if (updateClauses.length === 0) {
             return { success: false, message: t.adminDashboard.account.noChangesMade };
        }
        
        updateClauses.push(`updated_at = NOW()`);
        values.push(session.id);
        const query = `UPDATE admins SET ${updateClauses.join(', ')} WHERE id = $${valueIndex}`;
        
        await client.query(query, values);
        
        return { success: true, message: t.adminDashboard.account.updateSuccess, data: { needsLogout: true } };
        
    } catch (error) {
        console.error("Error updating admin account:", error);
        return { success: false, message: "Error del servidor." };
    } finally {
        if (client) client.release();
    }
}

export async function verifySessionIntegrity(): Promise<{isValid: boolean}> {
    const session = await getCurrentSession();
    if (!session) {
        return { isValid: false };
    }

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        
        const result = await client.query('SELECT name, email FROM admins WHERE id = $1', [session.id]);
        if (result.rows.length === 0) {
            return { isValid: false };
        }

        const dbAdmin = result.rows[0];
        
        if (session.name !== dbAdmin.name || session.email !== dbAdmin.email) {
            return { isValid: false };
        }

        return { isValid: true };

    } catch (error) {
        console.error("Error verifying session integrity:", error);
        return { isValid: false };
    } finally {
        if (client) client.release();
    }
}

export async function handleFirstLogin(prevState: any, formData: FormData): Promise<ActionState> {
    const email = formData.get('email') as string;
    const pin = formData.get('pin') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirm_password') as string;

    if (!email || !pin || !password || !confirmPassword) {
        return { success: false, message: "toast.firstLogin.missingFields" };
    }
    if (password !== confirmPassword) {
        return { success: false, message: "toast.firstLogin.passwordMismatch" };
    }

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        
        const adminResult = await client.query('SELECT * FROM admins WHERE email = $1', [email]);
        if (adminResult.rows.length === 0) {
            return { success: false, message: "toast.firstLogin.invalidUser" };
        }
        const admin = adminResult.rows[0];

        if (admin.password_hash !== null) {
            return { success: false, message: "toast.firstLogin.alreadyActive" };
        }

        const pinResult = await client.query('SELECT * FROM admin_first_login_pins WHERE admin_id = $1 AND expires_at > NOW()', [admin.id]);
        if (pinResult.rows.length === 0) {
            return { success: false, message: "toast.firstLogin.pinExpired" };
        }
        const storedPin = pinResult.rows[0];

        const pinMatch = await bcrypt.compare(pin, storedPin.pin_hash);
        if (!pinMatch) {
            return { success: false, message: "toast.firstLogin.invalidPin" };
        }

        const newPasswordHash = await bcrypt.hash(password, 10);
        await client.query('UPDATE admins SET password_hash = $1 WHERE id = $2', [newPasswordHash, admin.id]);
        
        await client.query('DELETE FROM admin_first_login_pins WHERE admin_id = $1', [admin.id]);

        const sessionResult = await createSession(admin.id, 'admin', {
            email: admin.email,
            name: admin.name,
            canCreateAdmins: admin.can_create_admins,
        });

        if (!sessionResult.success) {
            return { success: false, message: "toast.adminLogin.sessionError" };
        }

    } catch (error) {
        console.error("Error during first login process:", error);
        return { success: false, message: "toast.adminLogin.serverError" };
    }

    redirect('/admin/dashboard');
}

// --- 2FA (TOTP) Functions ---
export async function generateTotpSecret(email: string): Promise<ActionState> {
    const session = await getCurrentSession();
    if (!session || session.type !== 'admin') {
        return { success: false, message: "No autorizado." };
    }
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(email, 'Follow For Me', secret);
    
    return { success: true, message: 'Secreto generado.', data: { qrCodeUrl: otpauth, secret: secret } };
}

export async function enableTotp(secret: string, token: string): Promise<ActionState> {
    const session = await getCurrentSession();
    if (!session || session.type !== 'admin') {
        return { success: false, message: "No autorizado." };
    }

    const isValid = authenticator.verify({ token, secret });
    if (!isValid) {
        return { success: false, message: "Código de verificación inválido." };
    }
    
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        await client.query(
            'INSERT INTO admin_totp_secrets (admin_id, secret) VALUES ($1, $2) ON CONFLICT (admin_id) DO UPDATE SET secret = $2',
            [session.id, secret]
        );
        return { success: true, message: "2FA activado con éxito." };
    } catch (error) {
        console.error("Error enabling TOTP:", error);
        return { success: false, message: "Error del servidor." };
    } finally {
        if(client) client.release();
    }
}

export async function verifyTotp(prevState: any, formData: FormData): Promise<ActionState> {
    const email = formData.get('email') as string;
    const token = formData.get('token') as string;
    
    if (!email || !token) {
        return { success: false, message: 'Email y código son requeridos.' };
    }

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const result = await client.query('SELECT a.*, s.secret as totp_secret FROM admins a JOIN admin_totp_secrets s ON a.id = s.admin_id WHERE a.email = $1', [email]);
        
        if (result.rows.length === 0 || !result.rows[0].totp_secret) {
            return { success: false, message: 'Usuario no encontrado o 2FA no está activo.' };
        }
        
        const admin = result.rows[0];
        const isValid = authenticator.verify({ token, secret: admin.totp_secret });

        if (!isValid) {
            return { success: false, message: 'Código 2FA inválido.' };
        }

        const sessionResult = await createSession(admin.id, 'admin', {
            email: admin.email,
            name: admin.name,
            canCreateAdmins: admin.can_create_admins,
        });

        if (!sessionResult.success) {
            return { success: false, message: "toast.adminLogin.sessionError" };
        }

    } catch (error) {
        console.error("Error verifying TOTP:", error);
        return { success: false, message: "Error del servidor." };
    }

    redirect('/admin/dashboard');
}

export async function hasTotpEnabled(): Promise<{enabled: boolean}> {
    const session = await getCurrentSession();
    if (!session) return { enabled: false };
    
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const result = await client.query('SELECT 1 FROM admin_totp_secrets WHERE admin_id = $1', [session.id]);
        return { enabled: result.rows.length > 0 };
    } catch (error) {
        console.error("Error checking TOTP status:", error);
        return { enabled: false };
    } finally {
        if (client) client.release();
    }
}

export async function disableTotp(): Promise<ActionState> {
    const session = await getCurrentSession();
    if (!session) return { success: false, message: "No autorizado." };

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        await client.query('DELETE FROM admin_totp_secrets WHERE admin_id = $1', [session.id]);
        return { success: true, message: "2FA desactivado con éxito." };
    } catch (error) {
        console.error("Error disabling TOTP:", error);
        return { success: false, message: "Error del servidor." };
    } finally {
        if (client) client.release();
    }
}
    

    

    
