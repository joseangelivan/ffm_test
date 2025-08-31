
'use server';

import { z } from 'zod';
import { getDbPool } from '@/lib/db';

export type MapProvider = {
    id: string;
    name: string;
    provider_type: 'google' | 'leaflet' | 'mapbox' | 'openlayers';
    config_json: any;
    is_default: boolean;
};

type ActionState<T = null> = {
    success: boolean;
    message: string;
    data?: T;
};

const ServiceSchema = z.object({
    name: z.string().min(1, "El nombre es obligatorio."),
    provider_type: z.string().min(1, "El tipo de proveedor es obligatorio."),
    config: z.string().refine((val) => {
        try { JSON.parse(val); return true; } catch (e) { return false; }
    }, { message: "La configuración debe ser un JSON válido."}),
});

export async function getMapProviders(): Promise<MapProvider[]> {
    let client;
    try {
        const pool = await getDbPool();
        if (!pool) return [];
        client = await pool.connect();
        const result = await client.query('SELECT * FROM map_providers ORDER BY name ASC');
        return result.rows;
    } catch (error) {
        console.error("Error getting map providers:", error);
        return [];
    } finally {
        if (client) client.release();
    }
}

export async function getDefaultMapProvider(): Promise<MapProvider | null> {
    let client;
    try {
        const pool = await getDbPool();
        if (!pool) return null;
        client = await pool.connect();
        const result = await client.query('SELECT * FROM map_providers WHERE is_default = TRUE LIMIT 1');
        if (result.rows.length > 0) {
            return result.rows[0];
        }
        // Fallback to any provider if no default is set
        const fallbackResult = await client.query('SELECT * FROM map_providers ORDER BY created_at ASC LIMIT 1');
        return fallbackResult.rows.length > 0 ? fallbackResult.rows[0] : null;

    } catch (error) {
        console.error("Error getting default map provider:", error);
        return null;
    } finally {
        if (client) client.release();
    }
}


export async function createMapProvider(prevState: any, formData: FormData): Promise<ActionState> {
    const validatedFields = ServiceSchema.safeParse({
        name: formData.get('name'),
        provider_type: formData.get('provider_type'),
        config: formData.get('config'),
    });

    if (!validatedFields.success) {
        return { success: false, message: validatedFields.error.errors[0].message };
    }
    
    const { name, provider_type, config } = validatedFields.data;
    
    let configJson;
    try {
        configJson = JSON.parse(config);
    } catch (e) {
        return { success: false, message: 'Formato JSON inválido.' };
    }

    let client;
    try {
        const pool = await getDbPool();
        if (!pool) return { success: false, message: 'Error del servidor.' };
        client = await pool.connect();
        
        await client.query('BEGIN');

        const countResult = await client.query('SELECT COUNT(*) FROM map_providers');
        const isFirstService = parseInt(countResult.rows[0].count, 10) === 0;

        await client.query(
            'INSERT INTO map_providers (name, provider_type, config_json, is_default) VALUES ($1, $2, $3, $4)',
            [name, provider_type, configJson, isFirstService]
        );
        
        await client.query('COMMIT');

        return { success: true, message: `Proveedor de mapas "${name}" creado con éxito.` };
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error("Error creating map provider:", error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}

export async function updateMapProvider(prevState: any, formData: FormData): Promise<ActionState> {
    const id = formData.get('id') as string;
    if (!id) return { success: false, message: "ID no proporcionado." };

    const validatedFields = ServiceSchema.safeParse({
        name: formData.get('name'),
        provider_type: formData.get('provider_type'),
        config: formData.get('config'),
    });

    if (!validatedFields.success) {
        return { success: false, message: validatedFields.error.errors[0].message };
    }

    const { name, provider_type, config } = validatedFields.data;
    
    let configJson;
    try {
        configJson = JSON.parse(config);
    } catch (e) {
        return { success: false, message: 'Formato JSON inválido.' };
    }

    let client;
    try {
        const pool = await getDbPool();
        if (!pool) return { success: false, message: 'Error del servidor.' };
        client = await pool.connect();
        const result = await client.query(
            'UPDATE map_providers SET name = $1, provider_type = $2, config_json = $3, updated_at = NOW() WHERE id = $4',
            [name, provider_type, configJson, id]
        );

        if (result.rowCount === 0) {
            return { success: false, message: "Proveedor no encontrado." };
        }
        
        return { success: true, message: `Proveedor "${name}" actualizado.` };
    } catch (error) {
        console.error("Error updating map provider:", error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}

export async function deleteMapProvider(id: string): Promise<ActionState> {
    if (!id) return { success: false, message: "ID no proporcionado." };

    let client;
    try {
        const pool = await getDbPool();
        if (!pool) return { success: false, message: 'Error del servidor.' };
        client = await pool.connect();
        
        await client.query('BEGIN');
        
        const service = await client.query('SELECT is_default FROM map_providers WHERE id = $1', [id]);
        if (service.rows.length === 0) {
            await client.query('ROLLBACK');
            return { success: false, message: 'Proveedor no encontrado.' };
        }

        await client.query('DELETE FROM map_providers WHERE id = $1', [id]);

        // If the deleted provider was the default, set another one as default
        if (service.rows[0].is_default) {
            const nextProvider = await client.query('SELECT id FROM map_providers ORDER BY created_at ASC LIMIT 1');
            if (nextProvider.rows.length > 0) {
                await client.query('UPDATE map_providers SET is_default = TRUE WHERE id = $1', [nextProvider.rows[0].id]);
            }
        }
        
        await client.query('COMMIT');
        return { success: true, message: 'Proveedor de mapas eliminado con éxito.' };
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error("Error deleting map provider:", error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}

export async function setMapProviderAsDefault(id: string): Promise<ActionState> {
    if (!id) return { success: false, message: "ID no proporcionado." };

    let client;
    try {
        const pool = await getDbPool();
        if (!pool) return { success: false, message: 'Error del servidor.' };
        client = await pool.connect();
        await client.query('BEGIN');
        await client.query('UPDATE map_providers SET is_default = FALSE');
        await client.query('UPDATE map_providers SET is_default = TRUE WHERE id = $1', [id]);
        await client.query('COMMIT');
        return { success: true, message: 'Proveedor establecido como predeterminado.' };
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error("Error setting default map provider:", error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}
