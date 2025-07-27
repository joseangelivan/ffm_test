
'use server';

import { Pool } from 'pg';
import { z } from 'zod';
import { getCurrentSession, getDbPool } from './auth';


export type Condominio = {
  id: string;
  name: string;
  address: string;
  created_at: string;
  updated_at: string;
  devices_count?: number;
  residents_count?: number;
  gatekeepers_count?: number;
};

type ActionState<T> = {
    success: boolean;
    message: string;
    data?: T;
};

const CondominioSchema = z.object({
    name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
    address: z.string().min(5, 'La dirección debe tener al menos 5 caracteres.'),
});


export async function getCondominios(): Promise<ActionState<Condominio[]>> {
    const session = await getCurrentSession();
    if (!session || session.type !== 'admin') {
        return { success: false, message: 'No autorizado.' };
    }

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        // We can expand this query later to include counts of residents, devices, etc.
        const result = await client.query('SELECT *, (SELECT COUNT(*) FROM residents WHERE condominio_id = condominios.id) as residents_count FROM condominios ORDER BY created_at DESC');
        return { success: true, message: 'Condominios obtenidos.', data: result.rows };
    } catch (error) {
        console.error('Error getting condominios:', error);
        return { success: false, message: 'Error del servidor al obtener condominios.' };
    } finally {
        if (client) client.release();
    }
}

export async function getCondominioById(id: string): Promise<ActionState<Condominio>> {
    const session = await getCurrentSession();
    if (!session || session.type !== 'admin') {
        return { success: false, message: 'No autorizado.' };
    }
    if (!id) {
         return { success: false, message: 'ID de condominio no proporcionado.' };
    }

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const result = await client.query('SELECT * FROM condominios WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return { success: false, message: 'Condominio no encontrado.' };
        }
        return { success: true, message: 'Condominio obtenido.', data: result.rows[0] };
    } catch (error) {
        console.error(`Error getting condominio by id ${id}:`, error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}


export async function createCondominio(prevState: any, formData: FormData): Promise<ActionState<null>> {
     const session = await getCurrentSession();
    if (!session || session.type !== 'admin') {
        return { success: false, message: 'No autorizado.' };
    }

    const validatedFields = CondominioSchema.safeParse({
        name: formData.get('name'),
        address: formData.get('address'),
    });

    if (!validatedFields.success) {
        return {
            success: false,
            message: validatedFields.error.flatten().fieldErrors.name?.[0] || validatedFields.error.flatten().fieldErrors.address?.[0] || "Error de validación."
        };
    }
    
    const { name, address } = validatedFields.data;

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        await client.query('INSERT INTO condominios (name, address) VALUES ($1, $2)', [name, address]);
        return { success: true, message: `Condomínio "${name}" criado com sucesso.` };
    } catch (error) {
        console.error('Error creating condominio:', error);
        return { success: false, message: 'Error del servidor al crear el condominio.' };
    } finally {
        if (client) client.release();
    }
}

export async function updateCondominio(prevState: any, formData: FormData): Promise<ActionState<null>> {
    const session = await getCurrentSession();
    if (!session || session.type !== 'admin') {
        return { success: false, message: 'No autorizado.' };
    }

    const id = formData.get('id') as string;
    if (!id) {
        return { success: false, message: 'ID no proporcionado.' };
    }
    
    const validatedFields = CondominioSchema.safeParse({
        name: formData.get('name'),
        address: formData.get('address'),
    });

    if (!validatedFields.success) {
        return {
            success: false,
            message: "Error de validación."
        };
    }
    const { name, address } = validatedFields.data;
    
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const result = await client.query(
            'UPDATE condominios SET name = $1, address = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
            [name, address, id]
        );
        if (result.rowCount === 0) {
            return { success: false, message: 'No se encontró el condominio para actualizar.' };
        }
        return { success: true, message: 'Condomínio atualizado com sucesso.' };
    } catch (error) {
        console.error('Error updating condominio:', error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}

export async function deleteCondominio(id: string): Promise<ActionState<null>> {
    const session = await getCurrentSession();
    if (!session || session.type !== 'admin') {
        return { success: false, message: 'No autorizado.' };
    }
    
    if (!id) {
        return { success: false, message: 'ID no proporcionado.' };
    }

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        // Consider cascading deletes or checks for related data (residents, devices) here
        const result = await client.query('DELETE FROM condominios WHERE id = $1', [id]);
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
