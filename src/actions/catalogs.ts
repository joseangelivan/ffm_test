
'use server';

import { z } from 'zod';
import { getDbPool } from '@/lib/db';

export type TranslationObject = {
    es: string;
    pt: string;
};

export type DeviceType = {
    id: string;
    name_translations: TranslationObject;
    features_translations: TranslationObject | null;
};

export type CommunicationProtocol = {
    id: string;
    name_translations: TranslationObject;
};

type ActionState<T = null> = {
    success: boolean;
    message: string;
    data?: T;
    errors?: Record<string, string[]>;
};

const TranslationsSchema = z.object({
    es: z.string().min(1, "La traducción al español es obligatoria."),
    pt: z.string().min(1, "A tradução para o português é obrigatória."),
});

const DeviceTypeSchema = z.object({
    name_es: z.string().min(1, "El nombre en español es obligatorio."),
    name_pt: z.string().min(1, "O nome em português é obrigatório."),
    features_es: z.string().optional(),
    features_pt: z.string().optional(),
});

// --- Device Types Actions ---

export async function getDeviceTypes(): Promise<DeviceType[]> {
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const result = await client.query('SELECT id, name_translations, features_translations FROM device_types ORDER BY id');
        return result.rows;
    } catch (error) {
        console.error("Error getting device types:", error);
        return [];
    } finally {
        if (client) client.release();
    }
}

export async function createDeviceType(prevState: any, formData: FormData): Promise<ActionState> {
    const validatedFields = DeviceTypeSchema.safeParse({
        name_es: formData.get('name_es'),
        name_pt: formData.get('name_pt'),
        features_es: formData.get('features_es'),
        features_pt: formData.get('features_pt'),
    });

    if (!validatedFields.success) {
        return { success: false, message: "Error de validación.", errors: validatedFields.error.flatten().fieldErrors };
    }
    
    const { name_es, name_pt, features_es, features_pt } = validatedFields.data;
    
    const name_translations = { es: name_es, pt: name_pt };
    const features_translations = (features_es || features_pt) ? { es: features_es || '', pt: features_pt || '' } : null;

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        await client.query(
            'INSERT INTO device_types (name_translations, features_translations) VALUES ($1, $2)',
            [name_translations, features_translations]
        );
        return { success: true, message: 'Tipo de dispositivo creado con éxito.' };
    } catch (error) {
        console.error("Error creating device type:", error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}

export async function updateDeviceType(prevState: any, formData: FormData): Promise<ActionState> {
    const id = formData.get('id') as string;
    if (!id) return { success: false, message: "ID no proporcionado." };

    const validatedFields = DeviceTypeSchema.safeParse({
        name_es: formData.get('name_es'),
        name_pt: formData.get('name_pt'),
        features_es: formData.get('features_es'),
        features_pt: formData.get('features_pt'),
    });

    if (!validatedFields.success) {
        return { success: false, message: "Error de validación.", errors: validatedFields.error.flatten().fieldErrors };
    }

    const { name_es, name_pt, features_es, features_pt } = validatedFields.data;

    const name_translations = { es: name_es, pt: name_pt };
    const features_translations = (features_es || features_pt) ? { es: features_es || '', pt: features_pt || '' } : null;

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        await client.query(
            'UPDATE device_types SET name_translations = $1, features_translations = $2, updated_at = NOW() WHERE id = $3',
            [name_translations, features_translations, id]
        );
        return { success: true, message: 'Tipo de dispositivo actualizado con éxito.' };
    } catch (error) {
        console.error("Error updating device type:", error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}

export async function deleteDeviceType(id: string): Promise<ActionState> {
    if (!id) return { success: false, message: "ID no proporcionado." };

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        await client.query('DELETE FROM device_types WHERE id = $1', [id]);
        return { success: true, message: 'Tipo de dispositivo eliminado con éxito.' };
    } catch (error) {
        console.error("Error deleting device type:", error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}
