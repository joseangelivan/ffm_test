
'use server';

import { z } from 'zod';
import { getDbPool, getCurrentSession } from './auth';

type ActionState<T = null> = {
    success: boolean;
    message: string;
    data?: T;
    errors?: Record<string, string[]>;
};

const AppSettingsSchema = z.object({
    id: z.string(),
    value: z.string().nullable(),
});

async function checkAdmin() {
    const session = await getCurrentSession();
    if (!session || session.type !== 'admin') {
        throw new Error('No autorizado.');
    }
    return session;
}

export async function getAppSetting(key: string): Promise<string | null> {
    let client;
    try {
        await checkAdmin();
        const pool = await getDbPool();
        client = await pool.connect();
        const result = await client.query('SELECT value FROM app_settings WHERE id = $1', [key]);
        return result.rows.length > 0 ? result.rows[0].value : null;
    } catch (error) {
        console.error(`Error getting app setting "${key}":`, error);
        return null;
    } finally {
        if (client) client.release();
    }
}

export async function updateAppSetting(key: string, value: string | null): Promise<ActionState> {
    try {
        await checkAdmin();
        if (!key) {
            return { success: false, message: "La clave es obligatoria." };
        }

        let client;
        try {
            const pool = await getDbPool();
            client = await pool.connect();
            await client.query(
                'INSERT INTO app_settings (id, value) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET value = $2, updated_at = NOW()',
                [key, value]
            );
            return { success: true, message: `Configuración "${key}" actualizada.` };
        } finally {
            if (client) client.release();
        }
    } catch (error: any) {
        console.error(`Error updating app setting "${key}":`, error);
        return { success: false, message: error.message || 'Error del servidor.' };
    }
}
