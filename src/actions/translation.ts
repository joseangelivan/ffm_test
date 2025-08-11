
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
    request_config: z.string().refine((val) => {
        try { JSON.parse(val); return true; } catch (e) { return false; }
    }, { message: "La configuración de solicitud debe ser un JSON válido."}),
    response_config: z.string().refine((val) => {
        try { JSON.parse(val); return true; } catch (e) { return false; }
    }, { message: "La configuración de respuesta debe ser un JSON válido."}),
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
        request_config: formData.get('request_config'),
        response_config: formData.get('response_config'),
    });

    if (!validatedFields.success) {
        return { success: false, message: validatedFields.error.errors[0].message };
    }
    
    const { name, request_config, response_config } = validatedFields.data;
    const combinedConfig = {
        request: JSON.parse(request_config),
        response: JSON.parse(response_config)
    };

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        
        await client.query(
            'INSERT INTO translation_services (name, config_json) VALUES ($1, $2)',
            [name, combinedConfig]
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
        request_config: formData.get('request_config'),
        response_config: formData.get('response_config'),
    });

    if (!validatedFields.success) {
        return { success: false, message: validatedFields.error.errors[0].message };
    }

    const { name, request_config, response_config } = validatedFields.data;
    const combinedConfig = {
        request: JSON.parse(request_config),
        response: JSON.parse(response_config)
    };

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        await client.query(
            'UPDATE translation_services SET name = $1, config_json = $2, updated_at = NOW() WHERE id = $3',
            [name, combinedConfig, id]
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
        await client.query('BEGIN');
        await client.query('UPDATE translation_services SET is_default = FALSE');
        await client.query('UPDATE translation_services SET is_default = TRUE WHERE id = $1', [id]);
        await client.query('COMMIT');
        return { success: true, message: 'Servicio establecido como predeterminado.' };
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error("Error setting default translation service:", error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}


function buildTranslationUrl(requestConfig: any, inputText: string, inputLang: string, outputLang: string): string | null {
    if (!requestConfig?.base_url || !requestConfig?.parameters) {
        return null;
    }

    const { base_url, parameters } = requestConfig;
    const urlParams = new URLSearchParams();

    for (const [key, value] of Object.entries(parameters)) {
        let paramValue = String(value);
        if (paramValue.includes('$InputText') || paramValue.includes('$InputLang') || paramValue.includes('$OutputLang')) {
            paramValue = paramValue.replace('$InputText', inputText);
            paramValue = paramValue.replace('$InputLang', inputLang);
            paramValue = paramValue.replace('$OutputLang', outputLang);
        }
        urlParams.append(key, paramValue);
    }

    return `${base_url}?${urlParams.toString()}`;
}

function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

async function translateText(
    service: TranslationService,
    text: string,
    inputLang: string,
    outputLang: string
): Promise<{ success: boolean; data?: string; error?: string }> {

    const requestConfig = service.config_json?.request;
    const responseConfig = service.config_json?.response;
    
    if (!requestConfig || !responseConfig) {
        return { success: false, error: "La configuración del servicio es inválida." };
    }

    const url = buildTranslationUrl(requestConfig, text, inputLang, outputLang);
    if (!url) {
        return { success: false, error: "No se pudo construir la URL de la API a partir del JSON. Verifica las claves 'base_url' y 'parameters'." };
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`La API respondió con el estado: ${response.status}`);
        }
        const responseData = await response.json();

        const responsePath = responseConfig.path;
        if (!responsePath) {
            return { success: false, error: "La configuración JSON de respuesta no define una ruta ('path')." };
        }

        const translatedText = getNestedValue(responseData, responsePath);

        if (translatedText) {
            return { success: true, data: translatedText };
        } else {
            return { success: false, error: `No se pudo encontrar el texto traducido en la ruta: '${responsePath}'. Respuesta de la API: ${JSON.stringify(responseData)}` };
        }
    } catch (apiError: any) {
        return { success: false, error: `Error al conectar con la API: ${apiError.message}` };
    }
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

    if (!service) {
        return { success: false, message: "Configuración JSON inválida o no encontrada." };
    }
    
    const translationResult = await translateText(service, "Hello", "en", "es");

    if (translationResult.success) {
        return { success: true, message: `¡Prueba exitosa! Respuesta: "${translationResult.data}"` };
    } else {
        return { success: false, message: `Prueba fallida. ${translationResult.error}` };
    }
}
