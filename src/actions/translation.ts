
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
    
    let combinedConfig;
    try {
        combinedConfig = {
            request: JSON.parse(request_config),
            response: JSON.parse(response_config)
        };
    } catch (e) {
        return { success: false, message: 'Formato JSON inválido.' };
    }

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
    
    let combinedConfig;
    try {
        combinedConfig = {
            request: JSON.parse(request_config),
            response: JSON.parse(response_config)
        };
    } catch (e) {
        return { success: false, message: 'Formato JSON inválido.' };
    }

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


function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

async function translateText(
    service: TranslationService,
    text: string,
    inputLang: string,
    outputLang: string
): Promise<{ success: boolean; data?: string; error?: string }> {
    console.log(`4.- [translateText] Iniciando traducción para el servicio: "${service.name}"`);
    console.log(`5.- [translateText] Configuración JSON cruda recibida:`, service.config_json);

    let config;
    try {
        if (typeof service.config_json === 'string') {
            config = JSON.parse(service.config_json);
        } else {
            config = service.config_json;
        }
    } catch (e) {
        console.error('6.- [translateText] Error: El JSON de configuración está corrupto.');
        return { success: false, error: "La configuración del servicio guardada está corrupta (JSON inválido)." };
    }
    
    console.log('6.- [translateText] Configuración JSON parseada:', config);
    
    const requestConfig = config?.request;
    const responseConfig = config?.response;

    console.log('7.- [translateText] Objeto de configuración de request extraído:', requestConfig);

    if (!requestConfig || !requestConfig.base_url || typeof requestConfig.parameters !== 'object') {
        console.error("8.- [translateText] Error: La configuración de request es inválida. Falta 'base_url' o 'parameters'.");
        return { success: false, error: "No se pudo construir la URL de la API a partir del JSON. Verifica las claves 'base_url' y 'parameters'." };
    }

    // --- Construcción de URL ---
    const { base_url, parameters } = requestConfig;
    const urlParams = new URLSearchParams();

    for (const [key, value] of Object.entries(parameters)) {
        let paramValue = String(value);

        if (paramValue.includes('$InputText')) {
            paramValue = paramValue.replace(/\$InputText/g, encodeURIComponent(text));
        }
        if (paramValue.includes('$InputLang')) {
            paramValue = paramValue.replace(/\$InputLang/g, inputLang);
        }
        if (paramValue.includes('$OutputLang')) {
            paramValue = paramValue.replace(/\$OutputLang/g, outputLang);
        }
        urlParams.append(key, paramValue);
    }
    
    const finalUrl = `${base_url}?${urlParams.toString()}`;
    console.log(`8.- [translateText] URL final construida: ${finalUrl}`);
    // --- Fin Construcción de URL ---

    try {
        console.log(`9.- [translateText] Realizando fetch a: ${finalUrl}`);
        const response = await fetch(finalUrl);
        
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`10.- [translateText] Error de la API. Estado: ${response.status}. Body:`, errorBody);
            throw new Error(`La API respondió con el estado: ${response.status}`);
        }

        const responseData = await response.json();
        console.log('10.- [translateText] Respuesta JSON de la API recibida:', responseData);

        const responsePath = responseConfig.path;

        if (!responsePath) {
            console.error("11.- [translateText] Error: La configuración de respuesta no define una 'path'.");
            return { success: false, error: "La configuración JSON de respuesta no define una ruta ('path')." };
        }

        const translatedText = getNestedValue(responseData, responsePath);
        console.log(`11.- [translateText] Texto traducido extraído de '${responsePath}':`, translatedText);

        if (translatedText) {
            console.log('12.- [translateText] Traducción exitosa.');
            return { success: true, data: translatedText };
        } else {
            console.error(`12.- [translateText] Error: No se pudo encontrar el texto traducido en la ruta: '${responsePath}'.`);
            return { success: false, error: `No se pudo encontrar el texto traducido en la ruta: '${responsePath}'. Respuesta de la API: ${JSON.stringify(responseData)}` };
        }
    } catch (apiError: any) {
        console.error('9.- [translateText] Error de fetch o conexión:', apiError);
        return { success: false, error: `Error al conectar con la API: ${apiError.message}` };
    }
}


export async function testTranslationService(id: string): Promise<ActionState> {
    console.log(`2.- [testTranslationService] Iniciando prueba para el servicio con ID: ${id}`);
    if (!id) {
        return { success: false, message: "ID no proporcionado." };
    }
    
    let client;
    let service: TranslationService | null = null;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const result = await client.query('SELECT * FROM translation_services WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            console.error(`[testTranslationService] Error: Servicio con ID ${id} no encontrado.`);
            return { success: false, message: "Servicio no encontrado." };
        }
        service = result.rows[0];
        console.log(`3.- [testTranslationService] Servicio "${service.name}" encontrado en la BD.`);

    } catch (dbError: any) {
        console.error(`[testTranslationService] Error de base de datos:`, dbError);
        return { success: false, message: "Error al leer la configuración de la base de datos." };
    } finally {
        if (client) {
            client.release();
        }
    }

    if (!service || !service.config_json) {
        console.error(`[testTranslationService] Error: Configuración JSON inválida o no encontrada para el servicio.`);
        return { success: false, message: "Configuración JSON inválida o no encontrada." };
    }
    
    try {
        const translationResult = await translateText(service, "Hello", "en", "es");
        console.log('11.- [testTranslationService] Resultado de la traducción:', translationResult);

        if (translationResult.success) {
            return { success: true, message: `¡Prueba exitosa! Respuesta: "${translationResult.data}"` };
        } else {
            return { success: false, message: `Prueba fallida. ${translationResult.error}` };
        }
    } catch (e: any) {
        console.error('[testTranslationService] Error inesperado:', e);
        return { success: false, message: e.message || "Error inesperado durante la traducción." };
    }
}
