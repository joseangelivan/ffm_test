
'use server';

import { z } from 'zod';
import { getDbPool } from '@/lib/db';

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
    request_config: z.string().refine((val) => {
        try { JSON.parse(val); return true; } catch (e) { return false; }
    }, { message: "La configuración de solicitud debe ser un JSON válido."}),
    response_config: z.string().refine((val) => {
        try { JSON.parse(val); return true; } catch (e) { return false; }
    }, { message: "La configuración de respuesta debe ser un JSON válido."}),
});

// Self-contained helper function to avoid import issues on server actions.
function getNestedValue(obj: any, path: string): any {
  if (!path) return undefined;
  // This regex allows for array access like 'results[0].geometry' and simple paths like '0.lat'
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

async function geocodeWithService(
    service: GeocodingService,
    address: string
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

    const requestConfig = config?.request?.api_config;
    const responseConfig = config?.response;

    if (!requestConfig?.base_url || typeof requestConfig?.parameters !== 'object') {
        return { success: false, error: "No se pudo construir la URL de la API a partir del JSON. Verifica las claves 'base_url' y 'parameters'." };
    }

    const { base_url, parameters } = requestConfig;
    const urlParams = new URLSearchParams();

    for (const [key, paramConfig] of Object.entries(parameters)) {
        let rawValue: any;

        if (typeof paramConfig === 'object' && paramConfig !== null) {
            rawValue = (paramConfig as any).value;
        } else {
            rawValue = paramConfig;
        }
        
        let paramValue = String(rawValue || '');
            
        if (typeof paramValue === 'string') {
            if (paramValue.startsWith('$')) {
                const varName = paramValue.substring(1);
                if (varName === 'Address') {
                    paramValue = address;
                } else {
                    const envValue = process.env[varName];
                     if (envValue) {
                        paramValue = envValue;
                    } else {
                        console.warn(`Geocoding Service: Environment variable "${varName}" not found.`);
                        paramValue = '';
                    }
                }
            }
        }
        
        if (paramValue) {
            urlParams.append(key, paramValue);
        }
    }
    
    const finalUrl = `${base_url}?${urlParams.toString()}`;

    try {
        const response = await fetch(finalUrl, { cache: 'no-store' });
        const responseText = await response.text();
        
        if (!response.ok) {
            throw new Error(`La API respondió con el estado: ${response.status}. Body: ${responseText}`);
        }

        let responseData: any;
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
             throw new Error(`La respuesta de la API no es un JSON válido. Body: ${responseText}`);
        }
        
        const latPath = responseConfig.lat;
        const lonPath = responseConfig.lon;

        if (!latPath || !lonPath) {
            return { success: false, error: "La configuración JSON de respuesta no define las rutas 'lat' y 'lon'." };
        }

        const lat = parseFloat(getNestedValue(responseData, latPath));
        const lon = parseFloat(getNestedValue(responseData, lonPath));

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


export async function getGeocodingServices(): Promise<GeocodingService[]> {
    let client;
    try {
        const pool = await getDbPool();
        if (!pool) return [];
        client = await pool.connect();
        const result = await client.query('SELECT * FROM geocoding_services ORDER BY created_at ASC');
        return result.rows;
    } catch (error) {
        console.error("Error getting geocoding services:", error);
        return [];
    } finally {
        if (client) client.release();
    }
}

export async function createGeocodingService(prevState: any, formData: FormData): Promise<ActionState> {
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
        if (!pool) return { success: false, message: 'Error del servidor.' };
        client = await pool.connect();
        const result = await client.query(
            'UPDATE geocoding_services SET name = $1, config_json = $2, updated_at = NOW() WHERE id = $3',
            [name, combinedConfig, id]
        );

        if (result.rowCount === 0) {
            return { success: false, message: "Servicio no encontrado." };
        }
        
        return { success: true, message: `Servicio "${name}" actualizado.` };
    } catch (error) {
        console.error("Error updating geocoding service:", error);
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
        if (!pool) return { success: false, message: "Error al leer la configuración de la base de datos." };
        client = await pool.connect();
        const result = await client.query('SELECT * FROM geocoding_services WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return { success: false, message: "Servicio no encontrado." };
        }
        service = result.rows[0];

    } catch (dbError: any) {
        return { success: false, message: "Error al leer la configuración de la base de datos." };
    } finally {
        if (client) client.release();
    }

    if (!service) {
         return { success: false, message: "Servicio no encontrado." };
    }
    
    // Example address for testing
    const testAddress = "1600 Amphitheatre Parkway, Mountain View, CA";
    const result = await geocodeWithService(service, testAddress);

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

type GeocodeRequest = {
  street: string;
  city: string;
  state: string;
  country: string;
};

export type GeocodeResult = {
    street_number: string | null;
    route: string; // Street name
    locality: string; // City
    administrative_area_level_1: string; // State
    country: string;
    formatted_address: string;
    geometry: {
        location: {
            lat: number;
            lng: number;
        }
    }
};

export async function geocodeAddress(request: GeocodeRequest): Promise<ActionState<GeocodeResult[]>> {
    const { street, city, state, country } = request;
    const fullAddress = [street, city, state, country].filter(Boolean).join(', ');

    // First try with Google as a fallback/default
    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (googleApiKey) {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${googleApiKey}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.status === 'OK' && data.results.length > 0) {
                 const results: GeocodeResult[] = data.results.map((result: any) => {
                    const components: any = {};
                    result.address_components.forEach((component: any) => {
                      const type = component.types[0];
                      components[type] = component.long_name;
                    });
                    return {
                      street_number: components.street_number || null,
                      route: components.route || '',
                      locality: components.locality || '',
                      administrative_area_level_1: components.administrative_area_level_1 || '',
                      country: components.country || '',
                      formatted_address: result.formatted_address,
                      geometry: result.geometry,
                    };
                }).filter((r: GeocodeResult) => r.route);
                 return { success: true, message: 'Direcciones encontradas con Google.', data: results };
            }
        } catch (error) {
            console.error("Google Geocoding API call failed", error);
        }
    }
    
    // If Google fails or no key, try the default dynamic service
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
        const serviceResult = await geocodeWithService(defaultService, fullAddress);
        if (serviceResult.success && serviceResult.data) {
             const customResult: GeocodeResult = {
                geometry: { location: { lat: serviceResult.data.lat, lng: serviceResult.data.lon } },
                formatted_address: fullAddress,
                street_number: null,
                route: street,
                locality: city,
                administrative_area_level_1: state,
                country: country,
            };
            return { success: true, message: "Dirección encontrada.", data: [customResult] };
        } else {
             return { success: false, message: serviceResult.error || "Error en el servicio de geocodificación." };
        }

    } catch (error: any) {
        console.error("Error geocoding address:", error);
        return { success: false, message: 'Error de servidor al geocodificar la dirección.' };
    } finally {
        if (client) client.release();
    }
}
