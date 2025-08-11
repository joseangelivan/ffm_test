
'use server';

import { z } from 'zod';
import { getDbPool } from '@/lib/db';

export type TranslationService = {
    id: string;
    name: string;
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
    config_json: z.string().refine((val) => {
        try {
            JSON.parse(val);
            return true;
        } catch (e) {
            return false;
        }
    }, { message: "La configuración debe ser un JSON válido."}),
});

export async function getTranslationServices(): Promise<TranslationService[]> {
    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const result = await client.query('SELECT * FROM translation_services ORDER BY created_at ASC');
        return result.rows;
    } catch (error) {
        console.error("Error getting translation services:", error);
        return [];
    } finally {
        if (client) client.release();
    }
}

export async function createTranslationService(prevState: any, formData: FormData): Promise<ActionState> {
    const validatedFields = ServiceSchema.safeParse({
        name: formData.get('name'),
        config_json: formData.get('config_json'),
    });

    if (!validatedFields.success) {
        return { success: false, message: validatedFields.error.errors[0].message };
    }
    
    const { name, config_json } = validatedFields.data;

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        
        await client.query(
            'INSERT INTO translation_services (name, config_json) VALUES ($1, $2)',
            [name, JSON.parse(config_json)]
        );
        return { success: true, message: `Servicio "${name}" creado con éxito.` };
    } catch (error) {
        console.error("Error creating translation service:", error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}

export async function updateTranslationService(prevState: any, formData: FormData): Promise<ActionState> {
    const id = formData.get('id') as string;
    if (!id) return { success: false, message: "ID no proporcionado." };

    const validatedFields = ServiceSchema.safeParse({
        name: formData.get('name'),
        config_json: formData.get('config_json'),
    });

    if (!validatedFields.success) {
        return { success: false, message: validatedFields.error.errors[0].message };
    }

    const { name, config_json } = validatedFields.data;

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        await client.query(
            'UPDATE translation_services SET name = $1, config_json = $2, updated_at = NOW() WHERE id = $3',
            [name, JSON.parse(config_json), id]
        );
        return { success: true, message: `Servicio "${name}" actualizado con éxito.` };
    } catch (error) {
        console.error("Error updating translation service:", error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}

export async function deleteTranslationService(id: string): Promise<ActionState> {
    if (!id) return { success: false, message: "ID no proporcionado." };

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        await client.query('DELETE FROM translation_services WHERE id = $1', [id]);
        return { success: true, message: 'Servicio de traducción eliminado con éxito.' };
    } catch (error) {
        console.error("Error deleting translation service:", error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}

export async function setTranslationServiceAsDefault(id: string): Promise<ActionState> {
    if (!id) return { success: false, message: "ID no proporcionado." };

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        // The trigger will handle unsetting other defaults
        await client.query('UPDATE translation_services SET is_default = TRUE WHERE id = $1', [id]);
        return { success: true, message: 'Servicio establecido como predeterminado.' };
    } catch (error) {
        console.error("Error setting default translation service:", error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}


// --- Helper Functions for Testing ---
function buildTranslationUrl(requestConfig: any, inputText: string, inputLang: string, outputLang: string): string | null {
    if (!requestConfig?.base_url || !requestConfig?.parameters) {
        return null;
    }

    const { base_url, parameters } = requestConfig;
    const urlParams = new URLSearchParams();

    for (const [key, value] of Object.entries(parameters)) {
        let paramValue = String(value);
        paramValue = paramValue.replace('$InputText', inputText);
        paramValue = paramValue.replace('$InputLang', inputLang);
        paramValue = paramValue.replace('$OutputLang', outputLang);
        urlParams.append(key, paramValue);
    }

    return `${base_url}?${urlParams.toString()}`;
}

function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}


export async function testTranslationService(id: string): Promise<ActionState> {
    if (!id) return { success: false, message: "ID no proporcionado." };
    
    let client;
    let service: TranslationService | null = null;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const result = await client.query('SELECT * FROM translation_services WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return { success: false, message: "Servicio no encontrado." };
        }
        service = result.rows[0];
    } catch (dbError: any) {
        console.error("DB Error fetching service for test:", dbError);
        return { success: false, message: "Error al leer la configuración de la base de datos." };
    } finally {
        if (client) client.release();
    }

    if (!service || !service.config_json) {
        return { success: false, message: "Configuración JSON inválida o no encontrada." };
    }
    
    const { config_json } = service;

    const testUrl = buildTranslationUrl(config_json.request, "Hello", "en", "es");
    if (!testUrl) {
        return { success: false, message: "No se pudo construir la URL de la API a partir del JSON. Verifica las claves 'base_url' y 'parameters'." };
    }

    try {
        const response = await fetch(testUrl);
        if (!response.ok) {
            return { success: false, message: `La API respondió con un error: ${response.status} ${response.statusText}` };
        }
        
        const responseData = await response.json();
        
        const responsePath = config_json.response?.path;
        if (!responsePath) {
            return { success: false, message: "La configuración JSON no define una ruta de respuesta ('response.path')." };
        }

        const translatedText = getNestedValue(responseData, responsePath);

        if (translatedText) {
            return { success: true, message: `¡Prueba exitosa! Respuesta: "${translatedText}"` };
        } else {
            return { success: false, message: `Prueba fallida. No se pudo encontrar el texto traducido en la ruta: '${responsePath}'. Respuesta recibida: ${JSON.stringify(responseData).substring(0, 100)}...` };
        }

    } catch (apiError: any) {
        console.error(`API Test Error for service ${id}:`, apiError);
        return { success: false, message: `Error al conectar con la API: ${apiError.message}` };
    }
}
