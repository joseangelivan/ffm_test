
'use server';

import { z } from 'zod';
import bcryptjs from 'bcryptjs';
import { getDbPool } from '@/lib/db';

export type CondoUser = {
  id: string;
  condominium_id: string;
  name: string;
  email: string;
  type: 'resident' | 'gatekeeper';
  location?: string | null;
  housing?: string | null;
  phone?: string | null;
  created_at: string;
};

type ActionState<T = null> = {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
};

const UserSchema = z.object({
    condominium_id: z.string().uuid("ID de condominio inválido."),
    name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
    email: z.string().email("Correo electrónico inválido."),
    type: z.enum(['resident', 'gatekeeper'], { errorMap: () => ({ message: "Tipo de usuario inválido."}) }),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
    location: z.string().optional(),
    housing: z.string().optional(),
    phone: z.string().optional(),
});

const UpdateUserSchema = UserSchema.omit({ password: true, condominium_id: true }).extend({
    id: z.string().uuid(),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres.").optional().or(z.literal('')),
});


export async function getUsersByCondoId(condoId: string): Promise<CondoUser[]> {
    if (!condoId) return [];
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();

        const residentsResult = await client.query(
            "SELECT id, condominium_id, name, email, 'resident' as type, location, housing, phone, created_at FROM residents WHERE condominium_id = $1",
            [condoId]
        );
        const gatekeepersResult = await client.query(
            "SELECT id, condominium_id, name, email, 'gatekeeper' as type, location, housing, phone, created_at FROM gatekeepers WHERE condominium_id = $1",
            [condoId]
        );

        const users = [...residentsResult.rows, ...gatekeepersResult.rows];
        users.sort((a, b) => a.name.localeCompare(b.name));
        
        return users;

    } catch (error) {
        console.error("Error getting users by condo ID:", error);
        return [];
    } finally {
        if (client) client.release();
    }
}

export async function createUser(prevState: any, formData: FormData): Promise<ActionState> {
    const validatedFields = UserSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { success: false, message: "Error de validación.", errors: validatedFields.error.flatten().fieldErrors };
    }

    const { condominium_id, name, email, type, password, location, housing, phone } = validatedFields.data;
    
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();

        const password_hash = await bcryptjs.hash(password, 10);
        const tableName = type === 'resident' ? 'residents' : 'gatekeepers';
        
        await client.query(
            `INSERT INTO ${tableName} (condominium_id, name, email, password_hash, location, housing, phone)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [condominium_id, name, email, password_hash, location, housing, phone]
        );

        return { success: true, message: `Usuario "${name}" creado con éxito.` };
    } catch (error: any) {
        console.error("Error creating user:", error);
        if (error.code === '23505') {
            return { success: false, message: "Ya existe un usuario con este correo electrónico." };
        }
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}


export async function updateUser(prevState: any, formData: FormData): Promise<ActionState> {
    const validatedFields = UpdateUserSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { success: false, message: "Error de validación.", errors: validatedFields.error.flatten().fieldErrors };
    }

    const { id, name, email, type, password, location, housing, phone } = validatedFields.data;

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        
        const tableName = type === 'resident' ? 'residents' : 'gatekeepers';

        const setClauses: string[] = [];
        const values: any[] = [];
        let valueIndex = 1;

        setClauses.push(`name = $${valueIndex++}`);
        values.push(name);
        setClauses.push(`email = $${valueIndex++}`);
        values.push(email);
        setClauses.push(`location = $${valueIndex++}`);
        values.push(location);
        setClauses.push(`housing = $${valueIndex++}`);
        values.push(housing);
        setClauses.push(`phone = $${valueIndex++}`);
        values.push(phone);
        
        if (password) {
            const password_hash = await bcryptjs.hash(password, 10);
            setClauses.push(`password_hash = $${valueIndex++}`);
            values.push(password_hash);
        }
        
        setClauses.push('updated_at = NOW()');
        values.push(id);
        
        const query = `UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE id = $${valueIndex}`;

        await client.query(query, values);
        
        return { success: true, message: "Usuario actualizado con éxito." };
    } catch (error: any) {
        console.error(`Error updating user ${id}:`, error);
        if (error.code === '23505') {
             return { success: false, message: "Ya existe un usuario con este correo electrónico." };
        }
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}


export async function deleteUser(id: string, type: 'resident' | 'gatekeeper'): Promise<ActionState> {
    if (!id || !type) {
        return { success: false, message: "ID o tipo de usuario no proporcionado." };
    }
    
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const tableName = type === 'resident' ? 'residents' : 'gatekeepers';
        
        const result = await client.query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
        
        if (result.rowCount === 0) {
            return { success: false, message: 'No se encontró el usuario para eliminar.' };
        }
        
        return { success: true, message: 'Usuario eliminado con éxito.' };
    } catch (error) {
        console.error(`Error deleting user ${id}:`, error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}
