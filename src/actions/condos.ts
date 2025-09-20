

'use server';

import { Pool } from 'pg';
import { z } from 'zod';
import { getDbPool } from '@/lib/db';
import { geocodeAddress } from './geocoding';


export type Condominio = {
  id: string;
  name: string;
  address: string;
  created_at: string;
  updated_at: string;
  devices_count?: number;
  residents_count?: number;
  gatekeepers_count?: number;
  region?: string;
  country?: string;
  state?: string;
  city?: string;
  street?: string;
  number?: string;
  latitude?: number | null;
  longitude?: number | null;
};

type ActionState<T> = {
    success: boolean;
    message: string;
    data?: T;
};

const CondominioSchema = z.object({
    name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
    region: z.string().min(2, 'La región es obligatoria.'),
    country: z.string().min(2, 'El país es obligatorio.'),
    state: z.string().min(2, 'El estado/provincia es obligatorio.'),
    city: z.string().min(2, 'La ciudad es obligatoria.'),
    street: z.string().min(3, 'La calle es obligatoria.'),
    number: z.string().min(1, 'El número es obligatorio.'),
    latitude: z.coerce.number().optional().nullable(),
    longitude: z.coerce.number().optional().nullable(),
});


export async function getCondominios(): Promise<ActionState<Condominio[]>> {
    let client;
    try {
        const pool = await getDbPool();
        if (!pool) return { success: false, message: 'Error del servidor al obtener condominios.' };
        client = await pool.connect();
        const result = await client.query(`
            SELECT 
                id, name, created_at, updated_at, region, country, state, city, street, number
            FROM 
                condominiums
            ORDER BY 
                created_at DESC;
        `);
        
        const data = result.rows.map(condo => {
            const addressParts = [
                condo.street,
                condo.number,
                condo.city,
                condo.state,
                condo.country
            ].filter(Boolean).join(', ');

            return {
                ...condo,
                address: addressParts,
                residents_count: 0,
                gatekeepers_count: 0,
                devices_count: 0
            };
        });

        return { success: true, message: 'Condominios obtenidos.', data: data };
    } catch (error) {
        console.error('Error getting condominios:', error);
        return { success: false, message: 'Error del servidor al obtener condominios.' };
    } finally {
        if (client) client.release();
    }
}

export async function getCondominioById(id: string): Promise<ActionState<Condominio>> {
    if (!id) {
         return { success: false, message: 'ID de condominio no proporcionado.' };
    }

    let client;
    try {
        const pool = await getDbPool();
        if (!pool) return { success: false, message: 'Error del servidor.' };
        client = await pool.connect();
        const result = await client.query('SELECT * FROM condominiums WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return { success: false, message: 'Condominio no encontrado.' };
        }
        
        const condoData = result.rows[0];

        const addressParts = [
            `${condoData.street || ''} ${condoData.number || ''}`.trim(),
            condoData.city,
            condoData.state,
            condoData.country
        ].filter(Boolean);

        const fullCondo: Condominio = {
            id: condoData.id,
            name: condoData.name,
            address: addressParts.join(', '),
            created_at: condoData.created_at,
            updated_at: condoData.updated_at,
            region: condoData.region,
            country: condoData.country,
            state: condoData.state,
            city: condoData.city,
            street: condoData.street,
            number: condoData.number,
            latitude: condoData.latitude,
            longitude: condoData.longitude
        };

        return { success: true, message: 'Condominio obtenido.', data: fullCondo };
    } catch (error) {
        console.error(`Error getting condominio by id ${id}:`, error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}


export async function createCondominio(prevState: any, formData: FormData): Promise<ActionState<null>> {
    const validatedFields = CondominioSchema.safeParse({
        name: formData.get('name'),
        region: formData.get('region'),
        country: formData.get('country'),
        state: formData.get('state'),
        city: formData.get('city'),
        street: formData.get('street'),
        number: formData.get('number'),
        latitude: formData.get('latitude'),
        longitude: formData.get('longitude'),
    });

    if (!validatedFields.success) {
        const errors = validatedFields.error.flatten().fieldErrors;
        const firstError = Object.values(errors)[0]?.[0];
        return {
            success: false,
            message: firstError || "Error de validación."
        };
    }
    
    const { name, region, country, state, city, street, number, latitude, longitude } = validatedFields.data;
    
    let lat: number | null = latitude || null;
    let lon: number | null = longitude || null;

    if (!lat || !lon) {
        const fullAddress = [street, number, city, state, country].filter(Boolean).join(', ');
        const geocodeResult = await geocodeAddress(fullAddress);
        if (geocodeResult.success && geocodeResult.data) {
            lat = geocodeResult.data.lat;
            lon = geocodeResult.data.lon;
        } else {
            console.warn(`Geocoding failed for new condo "${name}": ${geocodeResult.message}`);
        }
    }


    let client;
    try {
        const pool = await getDbPool();
        if (!pool) return { success: false, message: 'Error del servidor al crear el condominio.' };
        client = await pool.connect();
        await client.query(
            'INSERT INTO condominiums (name, region, country, state, city, street, number, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [name, region, country, state, city, street, number, lat, lon]
        );
        return { success: true, message: `Condomínio "${name}" criado com sucesso.` };
    } catch (error: any) {
        console.error('Error creating condominio:', error);
         if (error.code === '23505') { // Unique violation
            return { success: false, message: 'Ya existe un condominio con ese nombre.' };
        }
        return { success: false, message: 'Error del servidor al crear el condominio.' };
    } finally {
        if (client) client.release();
    }
}

export async function updateCondominio(prevState: any, formData: FormData): Promise<ActionState<null>> {
    const id = formData.get('id') as string;
    if (!id) {
        return { success: false, message: 'ID no proporcionado.' };
    }
    
    const validatedFields = CondominioSchema.safeParse({
        name: formData.get('name'),
        region: formData.get('region'),
        country: formData.get('country'),
        state: formData.get('state'),
        city: formData.get('city'),
        street: formData.get('street'),
        number: formData.get('number'),
        latitude: formData.get('latitude'),
        longitude: formData.get('longitude'),
    });

    if (!validatedFields.success) {
        const errors = validatedFields.error.flatten().fieldErrors;
        const firstError = Object.values(errors)[0]?.[0];
        return {
            success: false,
            message: firstError || "Error de validación."
        };
    }
    const { name, region, country, state, city, street, number, latitude, longitude } = validatedFields.data;
    
    let lat: number | null = latitude || null;
    let lon: number | null = longitude || null;

    if (!lat || !lon) {
        const fullAddress = [street, number, city, state, country].filter(Boolean).join(', ');
        const geocodeResult = await geocodeAddress(fullAddress);
        if (geocodeResult.success && geocodeResult.data) {
            lat = geocodeResult.data.lat;
            lon = geocodeResult.data.lon;
        } else {
            console.warn(`Geocoding failed while updating condo "${name}": ${geocodeResult.message}`);
        }
    }


    let client;
    try {
        const pool = await getDbPool();
        if (!pool) return { success: false, message: 'Error del servidor.' };
        client = await pool.connect();
        const result = await client.query(
            'UPDATE condominiums SET name = $1, region = $2, country = $3, state = $4, city = $5, street = $6, number = $7, latitude = $8, longitude = $9, updated_at = NOW() WHERE id = $10 RETURNING *',
            [name, region, country, state, city, street, number, lat, lon, id]
        );
        if (result.rowCount === 0) {
            return { success: false, message: 'No se encontró el condominio para actualizar.' };
        }
        return { success: true, message: 'Condomínio atualizado com sucesso.' };
    } catch (error: any) {
        console.error('Error updating condominio:', error);
        if (error.code === '23505') { // Unique violation
            return { success: false, message: 'Ya existe un condominio con ese nombre.' };
        }
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}

export async function deleteCondominio(id: string): Promise<ActionState<null>> {
    if (!id) {
        return { success: false, message: 'ID no proporcionado.' };
    }

    let client;
    try {
        const pool = await getDbPool();
        if (!pool) return { success: false, message: 'Error del servidor.' };
        client = await pool.connect();
        // Consider cascading deletes or checks for related data (residents, devices) here
        const result = await client.query('DELETE FROM condominiums WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return { success: false, message: 'No se encontró el condominio para eliminar.' };
        }
        return { success: true, message: 'Condomínio excluído com sucesso.' };
    } catch (error) {
        console.error('Error deleting condominio:', error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}

export async function updateCondoCoordinates(condoId: string, lat: number, lon: number): Promise<void> {
    let client;
    try {
        const pool = await getDbPool();
        if (!pool) return;
        client = await pool.connect();
        await client.query('UPDATE condominiums SET latitude = $1, longitude = $2 WHERE id = $3', [lat, lon, condoId]);
        console.log(`Updated coordinates for condo ${condoId}`);
    } catch (error) {
        console.error(`Failed to update coordinates for condo ${condoId}:`, error);
    } finally {
        if (client) client.release();
    }
}
