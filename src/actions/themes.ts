
'use server';

import { z } from 'zod';
import { getDbPool } from '@/lib/db';
import { updateAppSetting } from './settings';

export type Theme = {
    id: string;
    name: string;
    is_default?: boolean;
    background_hsl: string;
    foreground_hsl: string;
    card_hsl: string;
    card_foreground_hsl: string;
    popover_hsl: string;
    popover_foreground_hsl: string;
    primary_hsl: string;
    primary_foreground_hsl: string;
    secondary_hsl: string;
    secondary_foreground_hsl: string;
    muted_hsl: string;
    muted_foreground_hsl: string;
    accent_hsl: string;
    accent_foreground_hsl: string;
    destructive_hsl: string;
    destructive_foreground_hsl: string;
    border_hsl: string;
    input_hsl: string;
    ring_hsl: string;
};

type ActionState<T = null> = {
    success: boolean;
    message: string;
    data?: T;
};

const HSLColorSchema = z.string().regex(/^\d{1,3}\s\d{1,3}%\s\d{1,3}%$/, {
  message: "Invalid HSL format. Expected 'H S% L%'."
});

const ThemeSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio.'),
  background_hsl: HSLColorSchema,
  foreground_hsl: HSLColorSchema,
  card_hsl: HSLColorSchema,
  card_foreground_hsl: HSLColorSchema,
  popover_hsl: HSLColorSchema,
  popover_foreground_hsl: HSLColorSchema,
  primary_hsl: HSLColorSchema,
  primary_foreground_hsl: HSLColorSchema,
  secondary_hsl: HSLColorSchema,
  secondary_foreground_hsl: HSLColorSchema,
  muted_hsl: HSLColorSchema,
  muted_foreground_hsl: HSLColorSchema,
  accent_hsl: HSLColorSchema,
  accent_foreground_hsl: HSLColorSchema,
  destructive_hsl: HSLColorSchema,
  destructive_foreground_hsl: HSLColorSchema,
  border_hsl: HSLColorSchema,
  input_hsl: HSLColorSchema,
  ring_hsl: HSLColorSchema,
});


export async function getThemes(): Promise<Theme[]> {
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const result = await client.query('SELECT * FROM themes ORDER BY name ASC');
        return result.rows;
    } catch (error) {
        console.error("Error getting themes:", error);
        return [];
    } finally {
        if (client) client.release();
    }
}

export async function getThemeById(id: string): Promise<Theme | null> {
    if (id === 'light' || id === 'dark') {
        return null;
    }
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const result = await client.query('SELECT * FROM themes WHERE id = $1', [id]);
        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error(`Error getting theme by id ${id}:`, error);
        return null;
    } finally {
        if (client) client.release();
    }
}


export async function createTheme(prevState: any, formData: FormData): Promise<ActionState<Theme>> {
    const validatedFields = ThemeSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
        return { success: false, message: firstError || "Error de validación." };
    }
    
    const { ...themeValues } = validatedFields.data;
    const setIsDefault = formData.get('set_app_default') === 'on';

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        await client.query('BEGIN');

        const newThemeResult = await client.query(
            `INSERT INTO themes (name, background_hsl, foreground_hsl, card_hsl, card_foreground_hsl, popover_hsl, popover_foreground_hsl, primary_hsl, primary_foreground_hsl, secondary_hsl, secondary_foreground_hsl, muted_hsl, muted_foreground_hsl, accent_hsl, accent_foreground_hsl, destructive_hsl, destructive_foreground_hsl, border_hsl, input_hsl, ring_hsl)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
             RETURNING *`,
            Object.values(themeValues)
        );
        const newTheme = newThemeResult.rows[0];

        if (setIsDefault) {
            await updateAppSetting('default_theme_id', newTheme.id);
        }

        await client.query('COMMIT');
        return { success: true, message: `Tema "${newTheme.name}" creado con éxito.`, data: newTheme };
    } catch (error: any) {
        if(client) await client.query('ROLLBACK');
        console.error("Error creating theme:", error);
        if (error.code === '23505') { // Unique violation
            return { success: false, message: 'Ya existe un tema con ese nombre.' };
        }
        return { success: false, message: 'Error del servidor al crear el tema.' };
    } finally {
        if (client) client.release();
    }
}


export async function updateTheme(prevState: any, formData: FormData): Promise<ActionState<Theme>> {
    const id = formData.get('id') as string;
    if (!id) {
        return { success: false, message: "ID del tema no proporcionado." };
    }

    const validatedFields = ThemeSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!validatedFields.success) {
        const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
        return { success: false, message: firstError || "Error de validación." };
    }

    const { ...themeValues } = validatedFields.data;
    const setIsDefault = formData.get('set_app_default') === 'on';

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        await client.query('BEGIN');

        const values = [...Object.values(themeValues), id];

        const updatedThemeResult = await client.query(
            `UPDATE themes SET 
             name = $1, background_hsl = $2, foreground_hsl = $3, card_hsl = $4, card_foreground_hsl = $5, 
             popover_hsl = $6, popover_foreground_hsl = $7, primary_hsl = $8, primary_foreground_hsl = $9, 
             secondary_hsl = $10, secondary_foreground_hsl = $11, muted_hsl = $12, muted_foreground_hsl = $13, 
             accent_hsl = $14, accent_foreground_hsl = $15, destructive_hsl = $16, destructive_foreground_hsl = $17, 
             border_hsl = $18, input_hsl = $19, ring_hsl = $20, updated_at = NOW()
             WHERE id = $21 RETURNING *`,
            values
        );
        
        if (updatedThemeResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return { success: false, message: 'No se encontró el tema para actualizar.' };
        }
        
        const updatedTheme = updatedThemeResult.rows[0];

        if (setIsDefault) {
             await updateAppSetting('default_theme_id', updatedTheme.id);
        }

        await client.query('COMMIT');
        return { success: true, message: 'Tema actualizado con éxito.', data: updatedTheme };
    } catch (error: any) {
        if(client) await client.query('ROLLBACK');
        console.error("Error updating theme:", error);
        if (error.code === '23505') {
            return { success: false, message: 'Ya existe un tema con ese nombre.' };
        }
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}


export async function deleteTheme(id: string): Promise<ActionState> {
    if (!id) {
        return { success: false, message: "ID del tema no proporcionado." };
    }
    
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        await client.query('BEGIN');
        
        // Revert users of this theme to 'light'
        await client.query("UPDATE admin_settings SET theme = 'light' WHERE theme = $1", [id]);
        
        // Check if it's the app default theme and revert
        const appDefaultResult = await client.query("SELECT value FROM app_settings WHERE id = 'default_theme_id'");
        if (appDefaultResult.rows[0]?.value === id) {
            await client.query("UPDATE app_settings SET value = 'light' WHERE id = 'default_theme_id'");
        }

        const result = await client.query('DELETE FROM themes WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return { success: false, message: 'No se encontró el tema para eliminar.' };
        }

        await client.query('COMMIT');
        return { success: true, message: 'Tema eliminado con éxito.' };
    } catch (error) {
        if(client) await client.query('ROLLBACK');
        console.error("Error deleting theme:", error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}
