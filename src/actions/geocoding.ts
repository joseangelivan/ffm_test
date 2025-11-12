
'use server';

import { z } from 'zod';
import { getDbPool } from '@/lib/db';
import { buildApiUrl } from '@/lib/api-helpers'; 

export type GeocodingService = {
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
    request_config: z.string().nullable().optional(),
    response_config: z.string().nullable().optional(),
    autocomplete_request_config: z.string().nullable().optional(),
    autocomplete_response_config: z.string().nullable().optional(),
});

function getNestedValue(obj: any, path: string): any {
    if (!path || path === '.') return obj;
    
    const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    let result = obj;
    for (const key of keys) {
      if (result === null || result === undefined) {
        return undefined;
      }
      result = result[key];
    }
    return result;
}

type ValueMap = { [key: string]: string | number | undefined };


async function geocodeWithService(
    service: GeocodingService,
    addressFields: { address: string, city?: string, state?: string, country?: string }
): Promise<{ success: boolean; data?: {lat: number, lon: number}; error?: string, debug?: { url: string, response?: any } }> {
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

    const requestConfig = config?.geocoordinates?.request || config?.request;
    const responseConfig = config?.geocoordinates?.response || config?.response;

    if (!requestConfig?.api_config?.base_url || typeof requestConfig?.api_config?.parameters !== 'object') {
        return { success: false, error: "No se pudo construir la URL de la API a partir del JSON. Verifica las claves 'base_url' y 'parameters'." };
    }
    
    const valueMap: ValueMap = {
        'Address': addressFields.address,
        'city': addressFields.city,
        'state': addressFields.state,
        'country': addressFields.country,
    };

    const finalUrl = buildApiUrl(requestConfig.api_config, valueMap, process.env);

    try {
        const response = await fetch(finalUrl, { cache: 'no-store' });
        const responseText = await response.text();
        
        if (!response.ok) {
            throw new Error(`La API respondió con el estado ${response.status}. Respuesta: ${responseText}`);
        }
        
        let responseData: any;
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            return { 
                success: false, 
                error: `La respuesta de la API no es un JSON válido. Respuesta: ${responseText}`,
                debug: { url: finalUrl, response: responseText }
            };
        }
        
        const latPath = responseConfig.lat;
        const lonPath = responseConfig.lon;

        if (!latPath || !lonPath) {
            return { success: false, error: "La configuración JSON de respuesta no define las rutas 'lat' y 'lon'." };
        }

        let results = responseData;
        if (responseConfig.results_path) {
            const nestedResults = getNestedValue(responseData, responseConfig.results_path);
            if (nestedResults !== undefined) {
                results = nestedResults;
            }
        }
        
        if (!Array.isArray(results) || results.length === 0) {
            return { success: false, error: "No se encontraron resultados en la respuesta de la API." };
        }

        let resultItem = results[0]; // Default to the first result

        // If a city and city_path are provided, try to find a better match
        if (addressFields.city && responseConfig.city_path) {
            const cityMatch = results.find(r => {
                const resultCity = getNestedValue(r, responseConfig.city_path);
                return resultCity && resultCity.toLowerCase().includes(addressFields.city!.toLowerCase());
            });
            if (cityMatch) {
                resultItem = cityMatch;
            }
        }


        const lat = parseFloat(getNestedValue(resultItem, latPath.replace('features.0.', '')));
        const lon = parseFloat(getNestedValue(resultItem, lonPath.replace('features.0.', '')));


        if (!isNaN(lat) && !isNaN(lon)) {
            return { success: true, data: { lat, lon } };
        } else {
            return { 
                success: false, 
                error: "No se pudieron extraer coordenadas válidas de la respuesta de la API.",
                debug: { url: finalUrl, response: responseData }
            };
        }

    } catch (apiError: any) {
        return { 
            success: false, 
            error: `Error al conectar con la API de geocodificación: ${apiError.message}`,
            debug: { url: finalUrl }
        };
    }
}


export async function getGeocodingServices(): Promise<{ services?: GeocodingService[], error?: string }> {
    let client;
    try {
        const pool = await getDbPool();
        if (!pool) return { error: "Error del servidor al conectar con la base de datos." };
        client = await pool.connect();
        const result = await client.query('SELECT * FROM geocoding_services ORDER BY created_at ASC');
        return { services: result.rows };
    } catch (error: any) {
        console.error("Error getting geocoding services:", error);
        return { error: error.message || 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}

export async function createGeocodingService(prevState: any, formData: FormData): Promise<ActionState> {
    const validatedFields = ServiceSchema.safeParse({
        name: formData.get('name'),
        request_config: formData.get('request_config') || null,
        response_config: formData.get('response_config') || null,
        autocomplete_request_config: formData.get('autocomplete_request_config') || null,
        autocomplete_response_config: formData.get('autocomplete_response_config') || null,
    });

    if (!validatedFields.success) {
        return { success: false, message: validatedFields.error.errors[0].message };
    }
    
    const { 
        name, 
        request_config, 
        response_config,
        autocomplete_request_config,
        autocomplete_response_config
    } = validatedFields.data;

    if (!request_config || !response_config) {
        return { success: false, message: "La configuración de geocoordenadas (solicitud y respuesta) es obligatoria." };
    }
    
    let combinedConfig;
    try {
        combinedConfig = {
            geocoordinates: {
                request: JSON.parse(request_config),
                response: JSON.parse(response_config)
            },
            autocomplete: {
                request: autocomplete_request_config ? JSON.parse(autocomplete_request_config) : null,
                response: autocomplete_response_config ? JSON.parse(autocomplete_response_config) : null,
            }
        };
    } catch (e: any) {
        return { success: false, message: `Formato JSON inválido: ${e.message}` };
    }

    let client;
    try {
        const pool = await getDbPool();
        if (!pool) return { success: false, message: 'Error del servidor.' };
        client = await pool.connect();
        
        await client.query('BEGIN');

        const countResult = await client.query('SELECT COUNT(*) FROM geocoding_services');
        const isFirstService = parseInt(countResult.rows[0].count, 10) === 0;

        await client.query(
            'INSERT INTO geocoding_services (name, config_json, is_default) VALUES ($1, $2, $3)',
            [name, combinedConfig, isFirstService]
        );
        
        await client.query('COMMIT');

        return { success: true, message: `Servicio de geocodificación "${name}" creado con éxito.` };
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error("Error creating geocoding service:", error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}

export async function updateGeocodingService(prevState: any, formData: FormData): Promise<ActionState> {
    const id = formData.get('id') as string;
    if (!id) return { success: false, message: "ID no proporcionado." };

    let client;
    try {
        const pool = await getDbPool();
        if (!pool) return { success: false, message: 'Error del servidor.' };
        client = await pool.connect();

        const existingResult = await client.query('SELECT config_json FROM geocoding_services WHERE id = $1', [id]);
        if (existingResult.rows.length === 0) {
            return { success: false, message: "Servicio no encontrado." };
        }
        let currentConfig = existingResult.rows[0].config_json || {};

        const validatedFields = ServiceSchema.safeParse({
            name: formData.get('name'),
            request_config: formData.get('request_config') || null,
            response_config: formData.get('response_config') || null,
            autocomplete_request_config: formData.get('autocomplete_request_config') || null,
            autocomplete_response_config: formData.get('autocomplete_response_config') || null,
        });
        
        if (!validatedFields.success) {
            return { success: false, message: validatedFields.error.errors[0].message };
        }
        const { name, ...configs } = validatedFields.data;

        if (configs.request_config && configs.response_config) {
             currentConfig.geocoordinates = {
                request: JSON.parse(configs.request_config),
                response: JSON.parse(configs.response_config),
             };
        }
        
        if (formData.has('active_tab') && formData.get('active_tab') === 'autocomplete') {
            currentConfig.autocomplete = {
                request: configs.autocomplete_request_config ? JSON.parse(configs.autocomplete_request_config) : currentConfig.autocomplete?.request || null,
                response: configs.autocomplete_response_config ? JSON.parse(configs.autocomplete_response_config) : currentConfig.autocomplete?.response || null,
            };
        }


        const result = await client.query(
            'UPDATE geocoding_services SET name = $1, config_json = $2, updated_at = NOW() WHERE id = $3',
            [name, currentConfig, id]
        );

        return { success: true, message: `Servicio "${name}" actualizado.` };
    } catch (error: any) {
        console.error("Error updating geocoding service:", error);
         if (error instanceof SyntaxError) {
            return { success: false, message: `Error de formato JSON: ${error.message}` };
        }
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}


export async function deleteGeocodingService(id: string): Promise<ActionState> {
    if (!id) return { success: false, message: "ID no proporcionado." };

    let client;
    try {
        const pool = await getDbPool();
        if (!pool) return { success: false, message: 'Error del servidor.' };
        client = await pool.connect();
        await client.query('DELETE FROM geocoding_services WHERE id = $1', [id]);
        return { success: true, message: 'Servicio de geocodificación eliminado con éxito.' };
    } catch (error) {
        console.error("Error deleting geocoding service:", error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}

export async function setGeocodingServiceAsDefault(id: string): Promise<ActionState> {
    if (!id) return { success: false, message: "ID no proporcionado." };

    let client;
    try {
        const pool = await getDbPool();
        if (!pool) return { success: false, message: 'Error del servidor.' };
        client = await pool.connect();
        await client.query('BEGIN');
        await client.query('UPDATE geocoding_services SET is_default = FALSE');
        await client.query('UPDATE geocoding_services SET is_default = TRUE WHERE id = $1', [id]);
        await client.query('COMMIT');
        return { success: true, message: 'Servicio establecido como predeterminado.' };
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error("Error setting default geocoding service:", error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}

export async function testGeocodingService(id: string): Promise<ActionState> {
    if (!id) {
        return { success: false, message: "ID no proporcionado." };
    }
    
    let client;
    let service: GeocodingService | null = null;
    try {
        const pool = await getDbPool();
        if (!pool) {
            return { success: false, message: "Error del servidor: no se pudo conectar a la base de datos." };
        }
        client = await pool.connect();
        const result = await client.query('SELECT * FROM geocoding_services WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return { success: false, message: "Servicio no encontrado." };
        }
        service = result.rows[0];

    } catch (dbError: any) {
        return { success: false, message: `Error al leer la configuración de la base de datos: ${dbError.message}` };
    } finally {
        if (client) client.release();
    }
    
    if (!service) {
        return { success: false, message: "Servicio no encontrado." };
    }
    
    const testAddress = "1600 Amphitheatre Parkway, Mountain View, CA";
    const result = await geocodeWithService(service, { address: testAddress });

    if (result.success && result.data) {
        return { 
            success: true, 
            message: `Prueba exitosa! Coordenadas para "${testAddress}": Lat: ${result.data.lat}, Lon: ${result.data.lon}` 
        };
    } else {
        let detailedError = `Prueba fallida. Error: ${result.error}`;
        if (result.debug) {
            let responseString = '';
            try {
                responseString = typeof result.debug.response === 'string' 
                    ? result.debug.response 
                    : JSON.stringify(result.debug.response, null, 2);
            } catch {
                responseString = String(result.debug.response);
            }
            detailedError += `\nURL: ${result.debug.url || 'No disponible'}\nRespuesta: ${responseString || 'No disponible'}`;
        }
        return { success: false, message: detailedError };
    }
}

export async function testGeocodingAutocompleteService(id: string): Promise<ActionState> {
    if (!id) {
        return { success: false, message: "ID no proporcionado." };
    }

    let service: GeocodingService | null = null;
    let client;
    try {
        const pool = await getDbPool();
        if (!pool) {
            return { success: false, message: "Error al leer la configuración de la base de datos." };
        }
        client = await pool.connect();
        const result = await client.query('SELECT * FROM geocoding_services WHERE id = $1', [id]);
        if (result.rows.length === 0) {
             return { success: false, message: "Servicio no encontrado." };
        }
        service = result.rows[0];
    } catch (dbError: any) {
        return { success: false, message: `Error al leer la configuración de la base de datos: ${dbError.message}` };
    } finally {
        if (client) client.release();
    }
    
    if (!service) {
        return { success: false, message: "Servicio no encontrado." };
    }
    
    const config = service?.config_json?.autocomplete;
    if (!config?.request?.api_config) {
        return { success: false, message: "La configuración de autocompletado es inválida o no existe." };
    }
    
    const finalUrl = buildApiUrl(
        config.request.api_config, 
        { 'Address': "Francisco" },
        process.env
    );

    try {
        const response = await fetch(finalUrl);
        const responseData = await response.json();

        if (!response.ok) {
            const errorPath = config.response?.error_path;
            if (errorPath) {
                const apiError = getNestedValue(responseData, errorPath);
                if (apiError) {
                    throw new Error(`La API respondió con el estado ${response.status}. Mensaje: ${apiError}`);
                }
            }
            throw new Error(`La API respondió con el estado ${response.status}. Respuesta: ${JSON.stringify(responseData)}`);
        }

        const results = getNestedValue(responseData, config.response.results_path);
        if (!Array.isArray(results) || results.length === 0) {
            return { success: false, message: "No se encontraron resultados en la ruta especificada." };
        }

        const addresses = results.map(r => getNestedValue(r, config.response.address_path)).filter(Boolean);
        if (addresses.length > 0) {
            return { success: true, message: `Prueba exitosa. Se encontraron ${addresses.length} sugerencias. Las primeras son:\n- ${addresses.slice(0, 3).join('\n- ')}` };
        } else {
            return { success: false, message: "Se encontraron resultados, pero no se pudo extraer ninguna dirección." };
        }

    } catch (apiError: any) {
        return { success: false, message: `Error al probar el autocompletado: ${apiError.message}` };
    }
}


type GeocodeRequest = {
  street: string;
  city: string;
  state: string;
  country: string;
};

export type AutocompleteRequest = {
  address: string;
  country_cca2?: string;
  state?: string;
  city?: string;
}

export type AutocompleteResult = {
    address: string;
    lat: number;
    lon: number;
    city?: string;
    state?: string;
    postcode?: string;
}

export async function autocompleteAddress(request: AutocompleteRequest): Promise<ActionState<AutocompleteResult[]>> {
    let client;
    try {
        const pool = await getDbPool();
        if (!pool) return { success: false, message: "Error de servidor." };
        client = await pool.connect();
        const serviceResult = await client.query('SELECT * FROM geocoding_services WHERE is_default = TRUE LIMIT 1');
        
        if (serviceResult.rows.length === 0) {
            return { success: false, message: "No se ha configurado un servicio de geocodificación predeterminado." };
        }
        
        const service = serviceResult.rows[0];
        const config = service.config_json?.autocomplete;

        if (!config?.request?.api_config || !config?.response) {
            return { success: false, message: "La configuración de autocompletado es inválida." };
        }
        
        const valueMap: ValueMap = {
            'Address': request.address,
            'country_cca2': request.country_cca2,
            'state': request.state,
            'city': request.city,
        };

        const finalUrl = buildApiUrl(config.request.api_config, valueMap, process.env);
        
        const apiResponse = await fetch(finalUrl);
        const responseData = await apiResponse.json();
        
        if (!apiResponse.ok) {
            const errorPath = config.response?.error_path;
            if (errorPath) {
                const apiError = getNestedValue(responseData, errorPath);
                if (apiError) {
                    return { success: false, message: `Error: ${apiError}` };
                }
            }
            return { success: false, message: `Error: La API respondió con el estado ${apiResponse.status}.` };
        }
        
        let results = getNestedValue(responseData, config.response.results_path);
        
        if (!Array.isArray(results)) {
            return { success: false, message: "No se encontraron resultados en la ruta especificada." };
        }
        
        // Server-side filtering by city if a city is provided in the request
        if (request.city && config.response.city_path) {
            results = results.filter(r => {
                const resultCity = getNestedValue(r, config.response.city_path);
                return resultCity && resultCity.toLowerCase().includes(request.city!.toLowerCase());
            });
        }
        
        const suggestions: AutocompleteResult[] = results.map(r => ({
            address: getNestedValue(r, config.response.address_path),
            lat: parseFloat(getNestedValue(r, config.response.lat_path)),
            lon: parseFloat(getNestedValue(r, config.response.lon_path)),
            city: config.response.city_path ? getNestedValue(r, config.response.city_path) : undefined,
            state: config.response.state_path ? getNestedValue(r, config.response.state_path) : undefined,
            postcode: config.response.postcode_path ? getNestedValue(r, config.response.postcode_path) : undefined,
        })).filter(s => s.address && !isNaN(s.lat) && !isNaN(s.lon));
        
        return { success: true, message: "Sugerencias obtenidas.", data: suggestions };

    } catch (error: any) {
        console.error("Error in autocompleteAddress:", error);
        return { success: false, message: `Error: ${error.message}` };
    } finally {
        if(client) client.release();
    }
}


export async function geocodeAddress(addressFields: { street: string, number?: string, city: string, state: string, country: string }): Promise<ActionState<any>> {
    const fullAddress = [addressFields.street, addressFields.number, addressFields.city, addressFields.state, addressFields.country].filter(Boolean).join(', ');
    if (!fullAddress || fullAddress.trim() === '') {
        return { success: false, message: 'La dirección no puede estar vacía.' };
    }

    let client;
    try {
        const pool = await getDbPool();
        if (!pool) return { success: false, message: 'Error de servidor al geocodificar la dirección.' };
        client = await pool.connect();
        const result = await client.query('SELECT * FROM geocoding_services WHERE is_default = TRUE LIMIT 1');
        
        if (result.rows.length === 0) {
            return { success: false, message: "No se ha configurado ningún servicio de geocodificación predeterminado." };
        }
        
        const defaultService = result.rows[0];
        const serviceResult = await geocodeWithService(defaultService, {
            address: `${addressFields.street}, ${addressFields.number}`,
            city: addressFields.city,
            state: addressFields.state,
            country: addressFields.country,
        });

        if (serviceResult.success && serviceResult.data) {
             return { success: true, message: "Dirección encontrada.", data: { lat: serviceResult.data.lat, lon: serviceResult.data.lon } };
        } else {
             return { success: false, message: serviceResult.error || "Error en el servicio de geocodificación.", data: null };
        }

    } catch (error: any) {
        console.error("Error geocoding address:", error);
        return { success: false, message: 'Error de servidor al geocodificar la dirección.' };
    } finally {
        if (client) client.release();
    }
}

    