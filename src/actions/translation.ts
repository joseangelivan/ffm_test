
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
    console.log('[buildTranslationUrl] Iniciando construcción de URL...');
    console.log('[buildTranslationUrl] Request Config Recibido:', requestConfig);

    if (!requestConfig?.base_url || !requestConfig?.parameters) {
        console.error('[buildTranslationUrl] Error: Falta base_url o parameters en requestConfig.');
        return null;
    }
    
    console.log('[buildTranslationUrl] base_url y parameters encontrados.');
    const { base_url, parameters } = requestConfig;
    const urlParams = new URLSearchParams();
    
    // Create a copy to avoid mutating the original object
    const staticParams = { ...parameters };
    console.log('[buildTranslationUrl] Parámetros originales (copia):', staticParams);

    // Handle dynamic parameters by finding which key holds the placeholder value
    for (const [key, value] of Object.entries(parameters)) {
        if (value === '$InputText') {
            console.log(`[buildTranslationUrl] Parámetro dinámico encontrado: ${key} -> $InputText`);
            urlParams.append(key, inputText);
            delete staticParams[key];
        } else if (value === '$InputLang') {
            console.log(`[buildTranslationUrl] Parámetro dinámico encontrado: ${key} -> $InputLang`);
            urlParams.append(key, inputLang);
            delete staticParams[key];
        } else if (value === '$OutputLang') {
            console.log(`[buildTranslationUrl] Parámetro dinámico encontrado: ${key} -> $OutputLang`);
            urlParams.append(key, outputLang);
            delete staticParams[key];
        }
    }

    // Append remaining static parameters
    console.log('[buildTranslationUrl] Añadiendo parámetros estáticos restantes:', staticParams);
    for (const [key, value] of Object.entries(staticParams)) {
        urlParams.append(key, String(value));
    }

    const finalUrl = `${base_url}?${urlParams.toString()}`;
    console.log('[buildTranslationUrl] URL Final Construida:', finalUrl);
    return finalUrl;
}

function getNestedValue(obj: any, path: string): any {
    console.log(`[getNestedValue] Buscando ruta: "${path}" en el objeto:`, obj);
    const result = path.split('.').reduce((acc, part) => acc && acc[part], obj);
    console.log('[getNestedValue] Valor encontrado:', result);
    return result;
}

async function translateText(
    service: TranslationService,
    text: string,
    inputLang: string,
    outputLang: string
): Promise<{ success: boolean; data?: string; error?: string }> {
    console.log(`[translateText] Iniciando traducción para: "${text}" con servicio: "${service.name}"`);

    let config;
    try {
        if (typeof service.config_json === 'string') {
            console.log('[translateText] config_json es una cadena, parseando...');
            config = JSON.parse(service.config_json);
        } else {
            console.log('[translateText] config_json ya es un objeto.');
            config = service.config_json;
        }
    } catch(e) {
        console.error('[translateText] Error crítico: No se pudo parsear config_json.', e);
        return { success: false, error: "La configuración del servicio guardada está corrupta (JSON inválido)." };
    }
    
    console.log('[translateText] Configuración completa del servicio:', config);

    const requestConfig = config?.request;
    const responseConfig = config?.response;
    
    console.log('[translateText] Objeto requestConfig extraído:', requestConfig);
    console.log('[translateText] Objeto responseConfig extraído:', responseConfig);

    if (!requestConfig || !responseConfig) {
        console.error('[translateText] Error: La configuración del servicio (request o response) es inválida.');
        return { success: false, error: "La configuración del servicio es inválida o incompleta." };
    }

    const url = buildTranslationUrl(requestConfig, text, inputLang, outputLang);
    if (!url) {
        console.error('[translateText] Error: No se pudo construir la URL de la API.');
        return { success: false, error: "No se pudo construir la URL de la API a partir del JSON. Verifica las claves 'base_url' y 'parameters'." };
    }

    try {
        console.log(`[translateText] Realizando fetch a: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[translateText] Error de API. Estado: ${response.status}. Body: ${errorBody}`);
            throw new Error(`La API respondió con el estado: ${response.status}`);
        }
        const responseData = await response.json();
        console.log('[translateText] Respuesta JSON cruda de la API:', responseData);

        const responsePath = responseConfig.path;
        const statusPath = responseConfig.statusPath;

        if (!responsePath) {
            console.error("[translateText] Error: La configuración JSON de respuesta no define una ruta ('path').");
            return { success: false, error: "La configuración JSON de respuesta no define una ruta ('path')." };
        }
        
        if (statusPath) {
             const statusValue = getNestedValue(responseData, statusPath);
             console.log(`[translateText] Estado extraído de la ruta '${statusPath}':`, statusValue);
             // Optional: Check statusValue here if needed
        }

        const translatedText = getNestedValue(responseData, responsePath);
        console.log(`[translateText] Texto traducido extraído de la ruta '${responsePath}': "${translatedText}"`);

        if (translatedText) {
            console.log('[translateText] Traducción exitosa.');
            return { success: true, data: translatedText };
        } else {
            console.error(`[translateText] Error: No se pudo encontrar el texto traducido en la ruta: '${responsePath}'.`);
            return { success: false, error: `No se pudo encontrar el texto traducido en la ruta: '${responsePath}'. Respuesta de la API: ${JSON.stringify(responseData)}` };
        }
    } catch (apiError: any) {
        console.error(`[translateText] Error en la llamada fetch: ${apiError.message}`);
        return { success: false, error: `Error al conectar con la API: ${apiError.message}` };
    }
}


export async function testTranslationService(id: string): Promise<ActionState> {
    console.log(`[testTranslationService] INICIO de prueba para el servicio con ID: ${id}`);
    if (!id) {
        console.error('[testTranslationService] Error: No se proporcionó ID.');
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
        console.log('[testTranslationService] Servicio recuperado de la BD:', service);
        console.log('[testTranslationService] Tipo de config_json en DB:', typeof service.config_json);

    } catch (dbError: any) {
        console.error("[testTranslationService] DB Error fetching service for test:", dbError);
        return { success: false, message: "Error al leer la configuración de la base de datos." };
    } finally {
        if (client) client.release();
    }

    if (!service || !service.config_json) {
        console.error('[testTranslationService] Error: Configuración JSON inválida o no encontrada en el servicio.');
        return { success: false, message: "Configuración JSON inválida o no encontrada." };
    }
    
    // Ensure config_json is an object
    if (typeof service.config_json !== 'object') {
        try {
            // Attempt to parse if it's a string
            service.config_json = JSON.parse(service.config_json);
            console.log('[testTranslationService] config_json fue parseado de string a objeto.');
        } catch (e) {
            console.error('[testTranslationService] Error: config_json no es un objeto y tampoco es un string JSON válido.', e);
            return { success: false, message: "El formato de configuración guardado es incorrecto. Debe ser un objeto JSON." };
        }
    }
    
    console.log('[testTranslationService] Llamando a translateText...');
    const translationResult = await translateText(service, "Hello", "en", "es");

    if (translationResult.success) {
        console.log('[testTranslationService] Prueba exitosa.');
        return { success: true, message: `¡Prueba exitosa! Respuesta: "${translationResult.data}"` };
    } else {
        console.error('[testTranslationService] Prueba fallida. Razón:', translationResult.error);
        return { success: false, message: `Prueba fallida. ${translationResult.error}` };
    }
}
