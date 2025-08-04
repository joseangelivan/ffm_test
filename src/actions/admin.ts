
'use server';

import { redirect } from 'next/navigation';
import bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { cookies } from 'next/headers';

import { getDbPool } from '@/lib/db';
import { createSession, getSession as getSessionFromToken, type SessionPayload } from '@/lib/session';
import { sendAdminFirstLoginEmail, sendEmailChangePin } from '@/lib/mailer';
import { getThemeById, getThemes } from '@/actions/themes';
import { getAppSetting } from '@/actions/settings';

import es from '@/locales/es.json';
import pt from '@/locales/pt.json';


// --- Types ---

export type Admin = {
    id: string;
    name: string;
    email: string;
    can_create_admins: boolean;
    created_at: string;
};

export type UserSettings = {
    theme: string;
    language: 'es' | 'pt';
}

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

type AuthState = {
  success: boolean;
  message: string;
  redirect?: string;
};

// --- Settings ---
async function ensureAdminSettingsExist(adminId: string) {
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        await client.query(
            'INSERT INTO admin_settings (admin_id) VALUES ($1) ON CONFLICT (admin_id) DO NOTHING',
            [adminId]
        );
    } catch (error) {
        console.error(`Failed to ensure settings exist for admin ${adminId}:`, error);
    } finally {
        if (client) client.release();
    }
}


export async function getSettings(session: SessionPayload | null): Promise<UserSettings | null> {
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
        await client.query(`INSERT INTO ${tableName} (${userIdColumn}, theme, language) VALUES ($1, $2, $3) ON CONFLICT (${userIdColumn}) DO UPDATE SET theme = EXCLUDED.theme, language = EXCLUDED.language`, [session.id, defaultSettings.theme, defaultSettings.language]);
        return defaultSettings;

    } catch (error) {
        console.error(`Failed to get settings for ${session.type} ${session.id}:`, error);
        return null;
    } finally {
        if (client) client.release();
    }
}

export async function updateSettings(settings: Partial<UserSettings>, session: SessionPayload | null): Promise<{success: boolean}> {
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


// --- Authentication Flow ---

export async function checkAdminEmail(prevState: any, formData: FormData): Promise<AuthState> {
    const email = formData.get('email') as string;
    if (!email) {
        return { success: false, message: "toast.adminLogin.missingCredentials" };
    }

    let client;
    let admin;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const result = await client.query('SELECT a.*, s.secret IS NOT NULL as has_totp FROM admins a LEFT JOIN admin_totp_secrets s ON a.id = s.admin_id WHERE a.email = $1', [email]);
        
        if (result.rows.length === 0) {
            return { success: false, message: "toast.adminLogin.invalidUser" };
        }
        admin = result.rows[0];

    } catch (error) {
        console.error('Error checking admin email:', error);
        return { success: false, message: "toast.adminLogin.serverError" };
    } finally {
        if (client) client.release();
    }

    const emailParam = encodeURIComponent(email);
    let redirectTo = '';
    if (admin.password_hash === null) {
        redirectTo = `/admin/first-login?email=${emailParam}`;
    } else if (admin.has_totp) {
        redirectTo = `/admin/verify-2fa?email=${emailParam}`;
    } else {
        redirectTo = `/admin/enter-password?email=${emailParam}`;
    }
    
    redirect(redirectTo);
}

export async function authenticateAdmin(prevState: any, formData: FormData): Promise<AuthState> {
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();

        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        if (!email || !password) {
            return { success: false, message: "toast.adminLogin.missingCredentials" };
        }
        
        const result = await client.query('SELECT * FROM admins WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return { success: false, message: "toast.adminLogin.invalidUser" };
        }

        const admin = result.rows[0];
        
        if (!admin.password_hash) {
            return { success: false, message: "toast.firstLogin.alreadyActive" };
        }
        
        const passwordMatch = await bcrypt.compare(password, admin.password_hash);
        
        if (!passwordMatch) {
            return { success: false, message: "toast.adminLogin.invalidCredentials" };
        }

        await ensureAdminSettingsExist(admin.id);
        
        const sessionResult = await createSession(admin.id, 'admin', {
            email: admin.email,
            name: admin.name,
            canCreateAdmins: !!admin.can_create_admins, // Ensure it's a boolean
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

export async function handleFirstLogin(prevState: any, formData: FormData): Promise<AuthState> {
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
        
        await ensureAdminSettingsExist(admin.id);

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


// --- Admin CRUD ---

export async function createAdmin(prevState: ActionState | undefined, formData: FormData): Promise<ActionState> {
    const sessionToken = cookies().get('session')?.value;
    const session = await getSessionFromToken(sessionToken);
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
        
        await ensureAdminSettingsExist(newAdminId);
        
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
    const sessionToken = cookies().get('session')?.value;
    const session = await getSessionFromToken(sessionToken);
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
    const sessionToken = cookies().get('session')?.value;
    const session = await getSessionFromToken(sessionToken);
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
    const sessionToken = cookies().get('session')?.value;
    const session = await getSessionFromToken(sessionToken);
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


// --- Account Management (Self-service) ---

function generateVerificationPin(): string {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit PIN
}

export async function requestEmailChange(newEmail: string): Promise<ActionState> {
    const sessionToken = cookies().get('session')?.value;
    const session = await getSessionFromToken(sessionToken);
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
        
        return await sendEmailChangePin(session.name, newEmail, pin, locale);

    } catch (error) {
        console.error("Error sending verification PIN:", error);
        return { success: false, message: "Error del servidor al enviar el PIN." };
    } finally {
        if (client) client.release();
    }
}

export async function verifyAdminEmailChangePin(newEmail: string, pin: string): Promise<ActionState> {
    const sessionToken = cookies().get('session')?.value;
    const session = await getSessionFromToken(sessionToken);
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
    const sessionToken = cookies().get('session')?.value;
    const session = await getSessionFromToken(sessionToken);
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
            return { success: false, message: t.adminDashboard.account.title };
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


export async function verifySessionIntegrity(session: SessionPayload): Promise<boolean> {
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        
        const result = await client.query('SELECT name, email, can_create_admins FROM admins WHERE id = $1', [session.id]);
        if (result.rows.length === 0) {
            return false;
        }

        const dbAdmin = result.rows[0];
        
        // Explicitly cast both to booleans for a safe comparison
        const dbCanCreateAdmins = !!dbAdmin.can_create_admins;
        const sessionCanCreateAdmins = !!session.canCreateAdmins;

        if (session.name !== dbAdmin.name || session.email !== dbAdmin.email || sessionCanCreateAdmins !== dbCanCreateAdmins) {
            return false;
        }

        return true;

    } catch (error) {
        console.error("Error verifying session integrity:", error);
        return false;
    } finally {
        if (client) client.release();
    }
}


// --- 2FA (TOTP) Functions ---

export async function generateTotpSecret(email: string): Promise<ActionState> {
    const sessionToken = cookies().get('session')?.value;
    const session = await getSessionFromToken(sessionToken);
    if (!session || session.type !== 'admin') {
        return { success: false, message: "No autorizado." };
    }
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(email, 'Follow For Me', secret);
    
    return { success: true, message: 'Secreto generado.', data: { qrCodeUrl: otpauth, secret: secret } };
}

export async function enableTotp(secret: string, token: string): Promise<ActionState> {
    const sessionToken = cookies().get('session')?.value;
    const session = await getSessionFromToken(sessionToken);
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

export async function verifyTotp(prevState: any, formData: FormData): Promise<AuthState> {
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

export async function hasTotpEnabled(session: SessionPayload | null): Promise<{enabled: boolean}> {
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
    const sessionToken = cookies().get('session')?.value;
    const session = await getSessionFromToken(sessionToken);
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


export async function getActiveTheme(settings: UserSettings | null) {
    let themeId = settings?.theme;

    if (!themeId) {
        const defaultThemeId = await getAppSetting('default_theme_id');
        themeId = defaultThemeId || 'light';
    }
    
    // Check built-in themes first
    if (themeId === 'light' || themeId === 'dark') {
        return null; // Indicates a built-in theme
    }

    const customTheme = await getThemeById(themeId);
    
    return customTheme;
}
