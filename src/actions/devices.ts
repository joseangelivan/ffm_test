
'use server';

import { getDbPool } from '@/lib/db';
import type { TranslationObject } from '@/actions/catalogs';
import { z } from 'zod';
import bcryptjs from 'bcryptjs';

export type Device = {
  id: string;
  condominium_id: string;
  device_type_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  device_type_name_translations: TranslationObject;
  protocol_id: string | null;
  protocol_name: string | null;
  physical_device_id: string | null;
};

export type DeviceCommunication = {
    device_id: string;
    physical_device_id: string | null;
    protocol_id: string;
}

const DeviceCommunicationSchema = z.object({
    device_id: z.string().uuid(),
    physical_device_id: z.string().optional().nullable(),
    protocol_id: z.string().uuid(),
});

const CreateDeviceSchema = z.object({
  condominium_id: z.string().uuid("ID de condominio inválido."),
  name: z.string().min(1, "El nombre es obligatorio."),
  device_type_id: z.string().uuid("El tipo de dispositivo es obligatorio."),
});


type ActionState = {
    success: boolean;
    message: string;
};


export async function getDevicesByCondoId(condoId: string): Promise<Device[]> {
    if (!condoId) return [];

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const query = `
            SELECT 
                d.id,
                d.condominium_id,
                d.device_type_id,
                d.name,
                d.created_at,
                d.updated_at,
                dt.name_translations as device_type_name_translations,
                dc.protocol_id,
                p.name as protocol_name,
                dc.physical_device_id
            FROM devices d
            JOIN device_types dt ON d.device_type_id = dt.id
            LEFT JOIN devices_communication dc ON d.id = dc.device_id
            LEFT JOIN protocols p ON dc.protocol_id = p.id
            WHERE d.condominium_id = $1
            ORDER BY d.name ASC;
        `;
        const result = await client.query(query, [condoId]);
        return result.rows;
    } catch (error) {
        console.error(`Error getting devices for condo ${condoId}:`, error);
        return [];
    } finally {
        if (client) client.release();
    }
}


export async function getDeviceCommunication(deviceId: string): Promise<DeviceCommunication | null> {
    if (!deviceId) return null;

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const result = await client.query('SELECT * FROM devices_communication WHERE device_id = $1', [deviceId]);
        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error(`Error getting device communication for device ${deviceId}:`, error);
        return null;
    } finally {
        if (client) client.release();
    }
}

export async function createOrUpdateDeviceCommunication(prevState: any, formData: FormData): Promise<ActionState> {
    const validatedFields = DeviceCommunicationSchema.safeParse({
        device_id: formData.get('device_id'),
        physical_device_id: formData.get('physical_device_id') || null,
        protocol_id: formData.get('protocol_id'),
    });

    if (!validatedFields.success) {
        return { success: false, message: 'Datos de entrada inválidos.' };
    }
    
    const { device_id, physical_device_id, protocol_id } = validatedFields.data;

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        await client.query(
            `INSERT INTO devices_communication (device_id, physical_device_id, protocol_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (device_id) 
             DO UPDATE SET 
                physical_device_id = EXCLUDED.physical_device_id,
                protocol_id = EXCLUDED.protocol_id,
                updated_at = NOW()`,
            [device_id, physical_device_id, protocol_id]
        );
        return { success: true, message: 'Configuración del dispositivo guardada con éxito.' };
    } catch (error) {
        console.error(`Error saving device communication for device ${device_id}:`, error);
        return { success: false, message: 'Error del servidor al guardar la configuración.' };
    } finally {
        if (client) client.release();
    }
}

export async function createDevice(prevState: any, formData: FormData): Promise<ActionState> {
    const validatedFields = CreateDeviceSchema.safeParse({
        condominium_id: formData.get('condominium_id'),
        name: formData.get('name'),
        device_type_id: formData.get('device_type_id'),
    });

    if (!validatedFields.success) {
        return { success: false, message: 'Datos inválidos.' };
    }

    const { condominium_id, name, device_type_id } = validatedFields.data;

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        
        await client.query(
            'INSERT INTO devices (condominium_id, name, device_type_id) VALUES ($1, $2, $3)',
            [condominium_id, name, device_type_id]
        );

        return { success: true, message: `Dispositivo "${name}" creado con éxito.` };
    } catch (error: any) {
        console.error('Error creating device:', error);
        if (error.code === '23505') { // unique_violation, assuming name is unique per condo
            return { success: false, message: 'Ya existe un dispositivo con este nombre en el condominio.' };
        }
        return { success: false, message: 'Error del servidor al crear el dispositivo.' };
    } finally {
        if (client) client.release();
    }
}

export async function deleteDevice(id: string): Promise<ActionState> {
    if (!id) {
        return { success: false, message: "ID no proporcionado." };
    }

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const result = await client.query('DELETE FROM devices WHERE id = $1', [id]);
        
        if (result.rowCount === 0) {
            return { success: false, message: 'No se encontró el dispositivo para eliminar.' };
        }
        
        return { success: true, message: 'Dispositivo eliminado con éxito.' };
    } catch (error) {
        console.error(`Error deleting device ${id}:`, error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}
