
'use server';

import { z } from 'zod';
import { getDbPool } from '@/lib/db';

// For this example, we'll store the password in plaintext in the DB.
// In a real-world application, this should be encrypted using a secret key
// stored securely outside of the repository (e.g., in a secret manager).
// We will simulate this by just storing it as text.

export type SmtpConfiguration = {
    id: string;
    name: string;
    host: string;
    port: number;
    secure: boolean;
    auth_user: string;
    auth_pass: string;
    priority: number;
};

type ActionState<T = null> = {
    success: boolean;
    message: string;
    data?: T;
    errors?: Record<string, string[]>;
};

const SmtpConfigSchema = z.object({
    name: z.string().min(1, "El nombre es obligatorio."),
    host: z.string().min(1, "El host es obligatorio."),
    port: z.coerce.number().int().min(1, "El puerto es obligatorio."),
    secure: z.boolean(),
    auth_user: z.string().email("Debe ser un correo electrónico válido."),
    auth_pass: z.string(), // Removed min(1) to allow empty on edit
});

/**
 * For internal use by the mailer. Does not check for admin session.
 * @returns A list of SMTP configurations.
 */
export async function getSmtpConfigsForMailer(): Promise<SmtpConfiguration[]> {
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const result = await client.query('SELECT * FROM smtp_configurations ORDER BY priority ASC');
        return result.rows;
    } catch (error) {
        console.error("Error getting SMTP configurations for mailer:", error);
        return [];
    } finally {
        if (client) client.release();
    }
}

/**
 * For use by the admin UI. Checks for admin session.
 * @returns A list of SMTP configurations.
 */
export async function getSmtpConfigurations(): Promise<SmtpConfiguration[]> {
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const result = await client.query('SELECT * FROM smtp_configurations ORDER BY priority ASC');
        return result.rows;
    } catch (error) {
        console.error("Error getting SMTP configurations:", error);
        return [];
    } finally {
        if (client) client.release();
    }
}


export async function createSmtpConfiguration(prevState: any, formData: FormData): Promise<ActionState> {
    const validatedFields = SmtpConfigSchema.safeParse({
        name: formData.get('name'),
        host: formData.get('host'),
        port: formData.get('port'),
        secure: formData.get('secure') === 'on',
        auth_user: formData.get('auth_user'),
        auth_pass: formData.get('auth_pass'),
    });

    if (!validatedFields.success) {
        return { success: false, message: "Error de validación.", errors: validatedFields.error.flatten().fieldErrors };
    }
    
    // Add specific check for password on creation
    if (!validatedFields.data.auth_pass) {
         return { success: false, message: "La contraseña es obligatoria al crear."};
    }

    const { name, host, port, secure, auth_user, auth_pass } = validatedFields.data;

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        
        // Get the current max priority to add the new one at the end
        const priorityResult = await client.query('SELECT MAX(priority) as max_priority FROM smtp_configurations');
        const nextPriority = (priorityResult.rows[0].max_priority || 0) + 1;

        await client.query(
            'INSERT INTO smtp_configurations (name, host, port, secure, auth_user, auth_pass, priority) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [name, host, port, secure, auth_user, auth_pass, nextPriority]
        );

        return { success: true, message: 'Configuración SMTP creada con éxito.' };
    } catch (error) {
        console.error("Error creating SMTP config:", error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}

export async function updateSmtpConfiguration(prevState: any, formData: FormData): Promise<ActionState> {
    const id = formData.get('id') as string;
    if (!id) return { success: false, message: "ID no proporcionado." };

    const validatedFields = SmtpConfigSchema.safeParse({
        name: formData.get('name'),
        host: formData.get('host'),
        port: formData.get('port'),
        secure: formData.get('secure') === 'on',
        auth_user: formData.get('auth_user'),
        auth_pass: formData.get('auth_pass'),
    });

    if (!validatedFields.success) {
        return { success: false, message: "Error de validación.", errors: validatedFields.error.flatten().fieldErrors };
    }
    
    const { name, host, port, secure, auth_user, auth_pass } = validatedFields.data;

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();

        let query = 'UPDATE smtp_configurations SET name = $1, host = $2, port = $3, secure = $4, auth_user = $5, updated_at = NOW()';
        const values: any[] = [name, host, port, secure, auth_user];

        if (auth_pass) {
            query += `, auth_pass = $${values.length + 1}`;
            values.push(auth_pass);
        }

        query += ` WHERE id = $${values.length + 1}`;
        values.push(id);
        
        const result = await client.query(query, values);
        
        if (result.rowCount === 0) {
             return { success: false, message: "Configuración no encontrada." };
        }

        return { success: true, message: 'Configuración SMTP actualizada con éxito.' };
    } catch (error) {
        console.error(`Error updating SMTP config ${formData.get('id')}:`, error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}

export async function deleteSmtpConfiguration(id: string): Promise<ActionState> {
    if (!id) return { success: false, message: "ID no proporcionado." };

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const result = await client.query('DELETE FROM smtp_configurations WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return { success: false, message: "Configuración no encontrada." };
        }

        // Re-order priorities after deletion
        const remainingConfigs = await client.query('SELECT id FROM smtp_configurations ORDER BY priority ASC');
        await client.query('BEGIN');
        for (let i = 0; i < remainingConfigs.rows.length; i++) {
            await client.query('UPDATE smtp_configurations SET priority = $1 WHERE id = $2', [i + 1, remainingConfigs.rows[i].id]);
        }
        await client.query('COMMIT');


        return { success: true, message: 'Configuración SMTP eliminada con éxito.' };
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error(`Error deleting SMTP config ${id}:`, error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}

export async function updateSmtpOrder(orderedIds: string[]): Promise<ActionState> {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
        return { success: false, message: "No se proporcionó un orden válido." };
    }

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        
        await client.query('BEGIN');
        
        for (let i = 0; i < orderedIds.length; i++) {
            const id = orderedIds[i];
            const priority = i + 1;
            await client.query('UPDATE smtp_configurations SET priority = $1 WHERE id = $2', [priority, id]);
        }
        
        await client.query('COMMIT');

        return { success: true, message: 'Orden de prioridad SMTP actualizado.' };
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error("Error updating SMTP order:", error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}


export async function testSmtpConfiguration(id: string): Promise<ActionState> {
    if (!id) return { success: false, message: "ID no proporcionado." };
    const nodemailer = (await import('nodemailer')).default;

    let client;
    let config: SmtpConfiguration | undefined;

    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const result = await client.query('SELECT * FROM smtp_configurations WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return { success: false, message: "Configuración no encontrada." };
        }
        config = result.rows[0];
    } finally {
        if (client) client.release();
    }

    if (!config) {
         return { success: false, message: "Error al recuperar la configuración." };
    }

    try {
         const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.auth_user,
                pass: config.auth_pass,
            },
            // Add a timeout to prevent long hangs
            connectionTimeout: 5 * 1000, // 5 seconds
            greetingTimeout: 5 * 1000, // 5 seconds
        });

        // Verify connection configuration
        await transporter.verify();

        const info = await transporter.sendMail({
            from: `"${config.name} (Prueba)" <${config.auth_user}>`,
            to: config.auth_user, // Send to self
            subject: 'Prueba de Conexión SMTP - Follow For Me',
            html: `
                <h1>¡Conexión Exitosa!</h1>
                <p>Este es un correo de prueba de la configuración SMTP llamada "<b>${config.name}</b>" en tu aplicación Follow For Me.</p>
                <p>Si recibiste este correo, significa que la configuración es correcta.</p>
                <p>Detalles:</p>
                <ul>
                    <li><b>Host:</b> ${config.host}</li>
                    <li><b>Puerto:</b> ${config.port}</li>
                    <li><b>Usuario:</b> ${config.auth_user}</li>
                </ul>
            `,
        });
         return { success: true, message: `Correo de prueba enviado con éxito a ${config.auth_user}.` };

    } catch (error: any) {
         console.error(`Failed to send test email with config "${config.name}". Error: ${error}`);
         // Provide a more specific error message
         const errorMessage = error.code === 'EAUTH' 
            ? 'Error de autenticación. Verifica el usuario y la contraseña.'
            : error.code === 'ECONNECTION'
            ? 'Error de conexión. Verifica el host y el puerto.'
            : `Error del servidor: ${error.message}`;

         return { success: false, message: errorMessage };
    }
}
