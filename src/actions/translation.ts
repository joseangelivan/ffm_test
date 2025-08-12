
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
        
        await client.query('BEGIN');

        // Check if it's the first service
        const countResult = await client.query('SELECT COUNT(*) FROM translation_services');
        const isFirstService = parseInt(countResult.rows[0].count, 10) === 0;

        await client.query(
            'INSERT INTO translation_services (name, config_json, is_default) VALUES ($1, $2, $3)',
            [name, combinedConfig, isFirstService]
        );
        
        await client.query('COMMIT');
        return { success: true, message: `Servicio "${name}" creado con éxito.` };
    } catch (error) {
        if (client) await client.query('ROLLBACK');
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
 * Supports conditional logic in the path.
 * @param obj The object to navigate.
 * @param path The path to the desired value (e.g., 'data.translations.0.translatedText' or 'status{value > 200 ? "ERROR" : "OK"}').
 * @returns The value if found, otherwise undefined.
 */
function getNestedValue(obj: any, path: string): any {
  // Extraer y procesar condicionales tipo "path{(condición)?valorTrue:valorFalse}"
  const conditionalMatch = path.match(/^(.*)\{(.*)\}$/);
  
  if (conditionalMatch) {
    const [_, basePath, condition] = conditionalMatch;
    // For paths like "object[0]", we need to support it. But for empty base path (e.g. "{value.length > 0}"), we should handle it.
    const value = basePath ? basePath.replace(/\[(\d+)\]/g, '.$1').split('.').reduce((o, k) => (o || {})[k], obj) : obj;
    
    // Ejecutar el ternario seguro
    try {
      const ternario = condition.replace(/"/g, "'"); // Normalizar comillas
      const expresion = `return ${ternario.replace(/value/g, JSON.stringify(value))}`;
      return new Function('value', expresion)(value);
    } catch {
      return value; // Si falla el ternario, devolver valor crudo
    }
  }
  
  // Path normal sin condicional, with support for array indexing
  return path.replace(/\[(\d+)\]/g, '.$1').split('.').reduce((o, k) => (o || {})[k], obj);
}


async function translateText(
    service: TranslationService,
    text: string,
    inputLang: string,
    outputLang: string
): Promise<{ success: boolean; data?: string; error?: string }> {
    let config: any;
    if (typeof service.config_json === 'string') {
        try {
            config = JSON.parse(service.config_json);
        } catch(e: any) {
            return { success: false, error: `Error interno al procesar la configuración JSON: ${e.message}` };
        }
    } else {
        config = service.config_json;
    }

    const requestConfig = config?.request?.api_config;
    const responseConfig = config?.response;

    if (!requestConfig?.base_url || typeof requestConfig?.parameters !== 'object') {
        return { success: false, error: "No se pudo construir la URL de la API a partir del JSON. Verifica las claves 'base_url' y 'parameters'." };
    }

    const { base_url, parameters } = requestConfig;
    const urlParams = new URLSearchParams();

    for (const [key, paramConfig] of Object.entries(parameters)) {
        let rawValue: any;
        let isOptional: boolean = true; 

        if (typeof paramConfig === 'object' && paramConfig !== null) {
            rawValue = (paramConfig as any).value;
            if ((paramConfig as any).optional === false) {
                isOptional = false; 
            }
        } else {
            rawValue = paramConfig;
        }

        const paramValue = String(rawValue || '')
            .replace(/\$InputText/g, encodeURIComponent(text))
            .replace(/\$InputLang/g, inputLang)
            .replace(/\$OutputLang/g, outputLang);
        
        if (paramValue || !isOptional) {
            urlParams.append(key, paramValue);
        }
    }
    
    const finalUrl = `${base_url}?${urlParams.toString()}`;

    try {
        const response = await fetch(finalUrl, { cache: 'no-store' });
        
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`La API respondió con el estado: ${response.status}. Body: ${errorBody}`);
        }

        const responseData = await response.json();
        const responsePath = responseConfig.path;

        if (!responsePath) {
            return { success: false, error: "La configuración JSON de respuesta no define una ruta ('path')." };
        }

        const translatedText = getNestedValue(responseData, responsePath);

        if (typeof translatedText === 'string' && translatedText) {
            return { success: true, data: translatedText };
        } else {
            const apiErrorStatus = responseConfig.statusPath ? getNestedValue(responseData, responseConfig.statusPath) : `HTTP ${response.status}`;
            const apiErrorDetails = responseConfig.detailsPath ? getNestedValue(responseData, responseConfig.detailsPath) : 'Sin detalles';
            
            let errorMessage = `No se pudo encontrar un texto válido en la ruta especificada: '${responsePath}'.`;
            if (apiErrorStatus) {
                errorMessage = `Error de la API (Estado ${apiErrorStatus}): ${apiErrorDetails || 'Sin detalles'}`;
            }

            return { success: false, error: errorMessage };
        }
    } catch (apiError: any) {
        return { success: false, error: `Error al conectar con la API: ${apiError.message}` };
    }
}


export async function testTranslationService(id: string): Promise<ActionState> {
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
            return { success: false, message: "Servicio no encontrado." };
        }
        service = result.rows[0];

    } catch (dbError: any) {
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

        if (translationResult.success) {
            return { success: true, message: `¡Prueba exitosa! Respuesta: "${translationResult.data}"` };
        } else {
            return { success: false, message: `Prueba fallida. ${translationResult.error}` };
        }
    } catch (e: any) {
        return { success: false, message: e.message || "Error inesperado durante la traducción." };
    }
}


export async function translateTextAction(data: {
  text: string;
  sourceLang: string;
  targetLang: string;
}): Promise<ActionState<string>> {
  if (!data.text) {
    return { success: true, message: 'Texto vacío, no se necesita traducción.', data: '' };
  }

  let client;
  try {
    const pool = await getDbPool();
    client = await pool.connect();
    const result = await client.query('SELECT * FROM translation_services WHERE is_default = TRUE');
    
    if (result.rows.length === 0) {
      return { success: false, message: "No se ha configurado ningún servicio de traducción predeterminado." };
    }
    
    const defaultService = result.rows[0];
    const translationResult = await translateText(defaultService, data.text, data.sourceLang, data.targetLang);

    if (translationResult.success) {
      return { success: true, message: "Traducción completada.", data: translationResult.data };
    } else {
      return { success: false, message: `Error de traducción: ${translationResult.error}` };
    }
  } catch (error: any) {
    console.error("Error in translateTextAction:", error);
    return { success: false, message: "Error del servidor al intentar traducir." };
  } finally {
    if (client) client.release();
  }
}
