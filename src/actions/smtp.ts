
'use server';

import { z } from 'zod';
import { getDbPool, getCurrentSession } from './auth';

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
    auth_pass: z.string().min(1, "La contraseña es obligatoria."),
});

async function checkAdmin() {
    const session = await getCurrentSession();
    if (!session || session.type !== 'admin') {
        throw new Error('No autorizado.');
    }
    return session;
}

export async function getSmtpConfigurations(): Promise<SmtpConfiguration[]> {
    let client;
    try {
        await checkAdmin();
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
    try {
        await checkAdmin();
        
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
            
            // Get the current max priority to add the new one at the end
            const priorityResult = await client.query('SELECT MAX(priority) as max_priority FROM smtp_configurations');
            const nextPriority = (priorityResult.rows[0].max_priority || 0) + 1;

            await client.query(
                'INSERT INTO smtp_configurations (name, host, port, secure, auth_user, auth_pass, priority) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [name, host, port, secure, auth_user, auth_pass, nextPriority]
            );

            return { success: true, message: 'Configuración SMTP creada con éxito.' };
        } finally {
            if (client) client.release();
        }

    } catch (error: any) {
        console.error("Error creating SMTP config:", error);
        return { success: false, message: error.message || 'Error del servidor.' };
    }
}

export async function updateSmtpConfiguration(prevState: any, formData: FormData): Promise<ActionState> {
     try {
        await checkAdmin();
        
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
            
            const result = await client.query(
                'UPDATE smtp_configurations SET name = $1, host = $2, port = $3, secure = $4, auth_user = $5, auth_pass = $6, updated_at = NOW() WHERE id = $7',
                [name, host, port, secure, auth_user, auth_pass, id]
            );
            
            if (result.rowCount === 0) {
                 return { success: false, message: "Configuración no encontrada." };
            }

            return { success: true, message: 'Configuración SMTP actualizada con éxito.' };
        } finally {
            if (client) client.release();
        }

    } catch (error: any) {
        console.error(`Error updating SMTP config ${formData.get('id')}:`, error);
        return { success: false, message: error.message || 'Error del servidor.' };
    }
}

export async function deleteSmtpConfiguration(id: string): Promise<ActionState> {
    try {
        await checkAdmin();
        if (!id) return { success: false, message: "ID no proporcionado." };

        let client;
        try {
            const pool = await getDbPool();
            client = await pool.connect();
            const result = await client.query('DELETE FROM smtp_configurations WHERE id = $1', [id]);

            if (result.rowCount === 0) {
                return { success: false, message: "Configuración no encontrada." };
            }

            return { success: true, message: 'Configuración SMTP eliminada con éxito.' };
        } finally {
            if (client) client.release();
        }
    } catch (error: any) {
        console.error(`Error deleting SMTP config ${id}:`, error);
        return { success: false, message: error.message || 'Error del servidor.' };
    }
}

export async function updateSmtpOrder(orderedIds: string[]): Promise<ActionState> {
    try {
        await checkAdmin();
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
            throw error;
        } finally {
            if (client) client.release();
        }
    } catch (error: any) {
        console.error("Error updating SMTP order:", error);
        return { success: false, message: error.message || 'Error del servidor.' };
    }
}
