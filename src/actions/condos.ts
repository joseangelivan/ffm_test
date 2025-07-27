
'use server';

import { Pool } from 'pg';
import { z } from 'zod';
import { getCurrentSession, getDbPool } from './auth';


export type Condominio = {
  id: string;
  name: string;
  street: string;
  number: string;
  city: string;
  state: string;
  country: string;
  address?: string; // Optional full address string for display
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
    country: z.string().min(2, 'El país es obligatorio.'),
    state: z.string().min(2, 'El estado/provincia es obligatorio.'),
    city: z.string().min(2, 'La ciudad es obligatoria.'),
    street: z.string().min(3, 'La calle es obligatoria.'),
    number: z.string().min(1, 'El número es obligatorio.'),
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
        const result = await client.query(`
            SELECT 
                *, 
                (SELECT COUNT(*) FROM residents WHERE condominium_id = condominiums.id) as residents_count,
                (street || ', ' || number || ', ' || city || ', ' || state || ', ' || country) as address
            FROM condominiums 
            ORDER BY created_at DESC
        `);
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
        const result = await client.query('SELECT * FROM condominiums WHERE id = $1', [id]);
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
        country: formData.get('country'),
        state: formData.get('state'),
        city: formData.get('city'),
        street: formData.get('street'),
        number: formData.get('number'),
    });

    if (!validatedFields.success) {
        const errors = validatedFields.error.flatten().fieldErrors;
        const firstError = Object.values(errors)[0]?.[0];
        return {
            success: false,
            message: firstError || "Error de validación."
        };
    }
    
    const { name, country, state, city, street, number } = validatedFields.data;

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        await client.query(
            'INSERT INTO condominiums (name, country, state, city, street, number) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (name) DO NOTHING',
            [name, country, state, city, street, number]
        );
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
        country: formData.get('country'),
        state: formData.get('state'),
        city: formData.get('city'),
        street: formData.get('street'),
        number: formData.get('number'),
    });

    if (!validatedFields.success) {
        const errors = validatedFields.error.flatten().fieldErrors;
        const firstError = Object.values(errors)[0]?.[0];
        return {
            success: false,
            message: firstError || "Error de validación."
        };
    }
    const { name, country, state, city, street, number } = validatedFields.data;
    
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const result = await client.query(
            'UPDATE condominiums SET name = $1, country = $2, state = $3, city = $4, street = $5, number = $6, updated_at = NOW() WHERE id = $7 RETURNING *',
            [name, country, state, city, street, number, id]
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
