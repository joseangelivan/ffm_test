
'use server';

import { z } from 'zod';
import { getDbPool } from '@/lib/db';

export type Geofence = {
    id: string;
    condominium_id: string;
    name: string;
    geometry: any;
    is_default: boolean;
};

const GeofenceSchema = z.object({
    condominium_id: z.string().uuid(),
    name: z.string().min(1, 'El nombre es obligatorio.'),
    geometry: z.any(),
});

type ActionState<T = null> = {
    success: boolean;
    message: string;
    data?: T;
};

// --- Geofence Actions ---

export async function getGeofencesByCondoId(condoId: string): Promise<Geofence[]> {
    if (!condoId) return [];
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const result = await client.query('SELECT * FROM geofences WHERE condominium_id = $1 ORDER BY name', [condoId]);
        return result.rows;
    } catch (error) {
        console.error("Error getting geofences:", error);
        return [];
    } finally {
        if (client) client.release();
    }
}

export async function createGeofence(data: { condoId: string, name: string, geometry: any, isDefault: boolean }): Promise<ActionState<Geofence>> {
    const validatedFields = GeofenceSchema.safeParse({ condominium_id: data.condoId, name: data.name, geometry: data.geometry });
    if (!validatedFields.success) {
        return { success: false, message: "Error de validación." };
    }

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        await client.query('BEGIN');

        if (data.isDefault) {
            await client.query('UPDATE geofences SET is_default = false WHERE condominium_id = $1', [data.condoId]);
        }

        const result = await client.query(
            'INSERT INTO geofences (condominium_id, name, geometry, is_default) VALUES ($1, $2, $3, $4) RETURNING *',
            [data.condoId, data.name, data.geometry, data.isDefault]
        );
        
        await client.query('COMMIT');
        return { success: true, message: 'Geocerca creada con éxito.', data: result.rows[0] };
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error("Error creating geofence:", error);
        return { success: false, message: 'Error del servidor al crear la geocerca.' };
    } finally {
        if (client) client.release();
    }
}

export async function updateGeofence(id: string, data: { name: string, geometry: any }): Promise<ActionState> {
     let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        await client.query(
            'UPDATE geofences SET name = $1, geometry = $2, updated_at = NOW() WHERE id = $3',
            [data.name, data.geometry, id]
        );
        return { success: true, message: 'Geocerca actualizada con éxito.' };
    } catch (error) {
        console.error("Error updating geofence:", error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}

export async function deleteGeofence(id: string): Promise<ActionState> {
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        await client.query('DELETE FROM geofences WHERE id = $1', [id]);
        return { success: true, message: 'Geocerca eliminada con éxito.' };
    } catch (error) {
        console.error("Error deleting geofence:", error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}

export async function setCondoDefaultGeofence(condoId: string, geofenceId: string): Promise<ActionState> {
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        await client.query('BEGIN');
        await client.query('UPDATE geofences SET is_default = false WHERE condominium_id = $1', [condoId]);
        await client.query('UPDATE geofences SET is_default = true WHERE id = $1 AND condominium_id = $2', [geofenceId, condoId]);
        await client.query('COMMIT');
        return { success: true, message: 'Geocerca predeterminada actualizada.' };
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error("Error setting default geofence:", error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}


// --- Map Element Type Actions ---

export async function getMapElementTypes(condoId: string) {
    if (!condoId) return [];
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const result = await client.query('SELECT * FROM map_element_types WHERE condominium_id = $1 ORDER BY name', [condoId]);
        return result.rows;
    } catch (error) {
        console.error("Error getting map element types:", error);
        return [];
    } finally {
        if (client) client.release();
    }
}

export async function createMapElementType(data: {condoId: string, name: string, iconSvg?: string}): Promise<ActionState> {
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        await client.query(
            'INSERT INTO map_element_types (condominium_id, name, icon_svg) VALUES ($1, $2, $3)',
            [data.condoId, data.name, data.iconSvg]
        );
        return { success: true, message: 'Tipo de elemento creado con éxito.' };
    } catch (error) {
        console.error("Error creating map element type:", error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}
