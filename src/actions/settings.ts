
'use server';

import { z } from 'zod';
import { getDbPool } from '@/lib/db';

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


export async function getAppSetting(key: string): Promise<string | null> {
    let client;
    try {
        const pool = await getDbPool();
        if (!pool) {
            console.warn(`Database pool not available, cannot get app setting "${key}".`);
            return null;
        }
        client = await pool.connect();
        const result = await client.query('SELECT value FROM app_settings WHERE id = $1', [key]);
        return result.rows.length > 0 ? result.rows[0].value : null;
    } catch (error) {
        // This is expected if the table doesn't exist yet during initialization
        if (!(error instanceof Error && 'code' in error && (error as any).code === '42P01')) {
            console.error(`Error getting app setting "${key}":`, error);
        }
        return null;
    } finally {
        if (client) client.release();
    }
}

export async function updateAppSetting(key: string, value: string | null): Promise<ActionState> {
    if (!key) {
        return { success: false, message: "La clave es obligatoria." };
    }

    let client;
    try {
        const pool = await getDbPool();
         if (!pool) {
            return { success: false, message: "No se pudo conectar a la base de datos." };
        }
        client = await pool.connect();
        await client.query(
            'INSERT INTO app_settings (id, value) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET value = $2, updated_at = NOW()',
            [key, value]
        );
        return { success: true, message: `Configuración "${key}" actualizada.` };
    } catch (error: any) {
        console.error(`Error updating app setting "${key}":`, error);
        return { success: false, message: error.message || 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}
