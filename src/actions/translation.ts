
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

/**
 * Safely navigates a nested object using a string path.
 * @param obj The object to navigate.
 * @param path The path to the desired value (e.g., 'data.translations.0.translatedText').
 * @returns The value if found, otherwise undefined.
 */
function getNestedValue(obj: any, path: string): any {
    // Handles paths like "data.translations[0].translatedText"
    return path.replace(/\[(\d+)\]/g, '.$1').split('.').reduce((o, k) => (o || {})[k], obj);
}

async function translateText(
    service: TranslationService,
    text: string,
    inputLang: string,
    outputLang: string
): Promise<{ success: boolean; data?: string; error?: string }> {
    console.log(`4.- [Server] Iniciando traducción para el servicio: "${service.name}"`);
    console.log(`5.- [Server] config_json crudo recibido de la BD:`, service.config_json);
    console.log(`6.- [Server] Tipo de config_json: ${typeof service.config_json}`);
    
    let config: any;
    if (typeof service.config_json === 'string') {
        try {
            console.log('7.- [Server] config_json es una cadena, intentando parsear...');
            config = JSON.parse(service.config_json);
        } catch(e: any) {
            console.error('8.- [Server] CRITICAL: Error al parsear config_json.', e);
            return { success: false, error: `Error interno al procesar la configuración JSON: ${e.message}` };
        }
    } else {
        console.log('7.- [Server] config_json ya es un objeto, usándolo directamente.');
        config = service.config_json;
    }

    console.log('9.- [Server] Objeto de configuración final:', config);

    const requestConfig = config?.request?.api_config;
    const responseConfig = config?.response;
    
    console.log('10.- [Server] Objeto de configuración de request extraído:', requestConfig);
    console.log('11.- [Server] Objeto de configuración de response extraído:', responseConfig);

    if (!requestConfig?.base_url || typeof requestConfig?.parameters !== 'object') {
        const errorMsg = "No se pudo construir la URL de la API a partir del JSON. Verifica las claves 'base_url' y 'parameters'.";
        console.error(`12.- [Server] Error: ${errorMsg}`);
        return { success: false, error: errorMsg };
    }

    // --- Construcción de URL ---
    const { base_url, parameters } = requestConfig;
    const urlParams = new URLSearchParams();

    for (const [key, value] of Object.entries(parameters)) {
        let paramValue = String(value)
            .replace(/\$InputText/g, encodeURIComponent(text))
            .replace(/\$InputLang/g, inputLang)
            .replace(/\$OutputLang/g, outputLang);
        urlParams.append(key, paramValue);
    }
    
    const finalUrl = `${base_url}?${urlParams.toString()}`;
    console.log(`13.- [Server] URL final construida: ${finalUrl}`);
    // --- Fin Construcción de URL ---

    try {
        console.log(`14.- [Server] Realizando fetch a: ${finalUrl}`);
        const response = await fetch(finalUrl, { cache: 'no-store' }); // Disable cache
        
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`15.- [Server] Error de la API. Estado: ${response.status}. Body:`, errorBody);
            throw new Error(`La API respondió con el estado: ${response.status}`);
        }

        const responseData = await response.json();
        console.log('15.- [Server] Respuesta JSON de la API recibida:', responseData);

        const responsePath = responseConfig.path;

        if (!responsePath) {
            console.error("16.- [Server] Error: La configuración de respuesta no define una 'path'.");
            return { success: false, error: "La configuración JSON de respuesta no define una ruta ('path')." };
        }

        console.log(`16.- [Server] Intentando extraer texto de la ruta: '${responsePath}'.`);
        const translatedText = getNestedValue(responseData, responsePath);
        console.log(`17.- [Server] Texto traducido extraído:`, translatedText);

        if (typeof translatedText === 'string' && translatedText) {
            console.log('18.- [Server] Traducción exitosa.');
            return { success: true, data: translatedText };
        } else {
            console.error(`18.- [Server] Error: No se pudo encontrar un texto válido en la ruta especificada.`);
            return { success: false, error: `No se pudo encontrar el texto traducido en la ruta: '${responsePath}'. Respuesta de la API: ${JSON.stringify(responseData)}` };
        }
    } catch (apiError: any) {
        console.error('14.1.- [Server] Error de fetch o conexión:', apiError);
        return { success: false, error: `Error al conectar con la API: ${apiError.message}` };
    }
}


export async function testTranslationService(id: string): Promise<ActionState> {
    console.log(`2.- [Server] Iniciando prueba para el servicio con ID: ${id}`);
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
            console.error(`3.- [Server] Error: Servicio con ID ${id} no encontrado.`);
            return { success: false, message: "Servicio no encontrado." };
        }
        service = result.rows[0];
        console.log(`3.- [Server] Servicio "${service.name}" encontrado en la BD.`);

    } catch (dbError: any) {
        console.error(`[Server] Error de base de datos:`, dbError);
        return { success: false, message: "Error al leer la configuración de la base de datos." };
    } finally {
        if (client) {
            client.release();
        }
    }

    if (!service) {
         return { success: false, message: "Servicio no encontrado." };
    }
    
    try {
        const translationResult = await translateText(service, "Hello", "en", "es");
        console.log('19.- [Server] Resultado de la traducción:', translationResult);

        if (translationResult.success) {
            return { success: true, message: `¡Prueba exitosa! Respuesta: "${translationResult.data}"` };
        } else {
            return { success: false, message: `Prueba fallida. ${translationResult.error}` };
        }
    } catch (e: any) {
        console.error('19.1.- [Server] Error inesperado:', e);
        return { success: false, message: e.message || "Error inesperado durante la traducción." };
    }
}
