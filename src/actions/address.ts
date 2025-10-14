
'use server';

import { z } from 'zod';
import { getDbPool } from '@/lib/db';

export type AddressService = {
    id: string;
    name: string;
    config_json: any;
    is_default: boolean;
};

export type AddressDataItem = {
    name: string;
    cca2?: string;
    flag?: string;
    code?: string;
};

export type AddressData = {
    regions?: AddressDataItem[];
    countries?: AddressDataItem[];
    states?: AddressDataItem[];
    cities?: string[];
    regionCodeMap?: Record<string, string>;
}

type ActionState<T = null> = {
    success: boolean;
    message: string;
    data?: T;
};

const ServiceSchema = z.object({
    name: z.string().min(1, "El nombre es obligatorio."),
    config: z.string().refine((val) => {
        try { JSON.parse(val); return true; } catch (e) { return false; }
    }, { message: "La configuración debe ser un JSON válido."}),
});

function getNestedValue(obj: any, path: string | undefined): any {
    if (typeof path !== 'string' || !path || path === '.') {
      return obj;
    }
    const match = path.match(/^\[(\d+)\]$/);
    if (match) {
        const index = parseInt(match[1], 10);
        return Array.isArray(obj) ? obj[index] : undefined;
    }
    const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    let result = obj;
    for (const key of keys) {
      if (result === null || result === undefined) {
        return undefined;
      }
      result = result[key];
       if (result === undefined) {
        return undefined;
      }
    }
    return result;
}


type ValueMap = { [key: string]: string | number | undefined };

function buildApiUrl(
    apiConfig: any,
    valueMap: ValueMap,
    env: NodeJS.ProcessEnv
): string {
    const { base_url, parameters } = apiConfig;
    const urlParams = new URLSearchParams();

    for (const [key, paramConfig] of Object.entries(parameters)) {
        let rawValue: any;
        let isOptional = false;

        if (typeof paramConfig === 'object' && paramConfig !== null && 'value' in paramConfig) {
            rawValue = paramConfig.value;
            isOptional = paramConfig.optional === true;
        } else {
            rawValue = paramConfig;
        }

        let paramValue: string | undefined;

        if (typeof rawValue === 'string' && rawValue.startsWith('$')) {
            const varName = rawValue.substring(1);
            paramValue = valueMap[varName]?.toString() || env[varName] || '';
        } else {
            paramValue = rawValue?.toString();
        }
        
        if (paramValue || !isOptional) {
             urlParams.append(key, paramValue || '');
        }
    }
    
    return `${base_url}?${urlParams.toString()}`;
}

async function fetchDataFromSource(
    dataType: 'regions' | 'countries' | 'states' | 'cities',
    config: any,
    params: FetchParams
): Promise<{ success: boolean, data?: any, error?: string }> {
    
    const requestConfig = config.request?.api_config?.parameters?.[dataType];
    const responseConfig = config.response?.[dataType];
    
    if (!responseConfig) {
        return { success: false, error: `Configuración de respuesta para '${dataType}' no encontrada.` };
    }

    // --- Caso 1: Datos obtenidos desde una URL ---
    if (requestConfig?.url) {
        try {
            let urlString = requestConfig.url;
            if (params.region_code) urlString = urlString.replace('$region_code', params.region_code);
            if (params.region) urlString = urlString.replace('$region', params.region);
            
            const method = requestConfig.method || 'GET';
            const headers = requestConfig.headers || {};
            const fetchOptions: RequestInit = { method, headers, cache: 'no-store' };

            if (method !== 'GET' && method !== 'HEAD' && requestConfig.body) {
                const body: { [key: string]: any } = {};
                for (const key in requestConfig.body) {
                    const value = requestConfig.body[key];
                    if (typeof value === 'string' && value.startsWith('$')) {
                        const paramName = value.substring(1);
                        body[key] = params[paramName as keyof FetchParams];
                    } else {
                        body[key] = value;
                    }
                }
                fetchOptions.body = JSON.stringify(body);
                if (!headers['Content-Type']) {
                    headers['Content-Type'] = 'application/json';
                }
            }

            const response = await fetch(urlString, fetchOptions);
            if (!response.ok) {
                return { success: false, error: `Error en la API de '${dataType}': El servidor respondió con el estado ${response.status}. URL: ${urlString}` };
            }
            const jsonResponse = await response.json();
            const dataList = getNestedValue(jsonResponse, responseConfig.path);
            
            if (Array.isArray(dataList)) {
                return { success: true, data: dataList };
            } else {
                return { success: false, error: `La ruta '${responseConfig.path}' para '${dataType}' no devolvió un array. Respuesta: ${JSON.stringify(jsonResponse)}` };
            }
        } catch (e: any) {
            return { success: false, error: `Error de red al obtener '${dataType}': ${e.message}` };
        }
    }
    // --- Caso 2: Datos incrustados en la configuración ---
    else if (requestConfig?.value) {
        return { success: true, data: requestConfig };
    }

    return { success: true, data: [] }; // No hay configuración para este tipo de datos, no es un error.
}


// --- Service Management Actions ---

export async function getAddressServices(): Promise<AddressService[]> {
    let client;
    try {
        const pool = await getDbPool();
        if (!pool) return [];
        client = await pool.connect();
        const result = await client.query('SELECT * FROM address_services ORDER BY created_at ASC');
        return result.rows;
    } catch (error) {
        console.error("Error getting address services:", error);
        return [];
    } finally {
        if (client) client.release();
    }
}

export async function createAddressService(prevState: any, formData: FormData): Promise<ActionState> {
     const validatedFields = ServiceSchema.safeParse({
        name: formData.get('name'),
        config: formData.get('config'),
    });

    if (!validatedFields.success) {
        return { success: false, message: validatedFields.error.errors[0].message };
    }
    
    const { name, config } = validatedFields.data;
    
    let configJson;
    try {
        configJson = JSON.parse(config);
    } catch (e) {
        return { success: false, message: 'Formato JSON inválido.' };
    }

    let client;
    try {
        const pool = await getDbPool();
        if (!pool) return { success: false, message: 'Error del servidor.' };
        client = await pool.connect();
        
        await client.query('BEGIN');

        const countResult = await client.query('SELECT COUNT(*) FROM address_services');
        const isFirstService = parseInt(countResult.rows[0].count, 10) === 0;

        await client.query(
            'INSERT INTO address_services (name, config_json, is_default) VALUES ($1, $2, $3)',
            [name, configJson, isFirstService]
        );
        
        await client.query('COMMIT');

        return { success: true, message: `Servicio de dirección "${name}" creado con éxito.` };
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error("Error creating address service:", error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}

export async function updateAddressService(prevState: any, formData: FormData): Promise<ActionState> {
    const id = formData.get('id') as string;
    if (!id) return { success: false, message: "ID no proporcionado." };

     const validatedFields = ServiceSchema.safeParse({
        name: formData.get('name'),
        config: formData.get('config'),
    });

    if (!validatedFields.success) {
        return { success: false, message: validatedFields.error.errors[0].message };
    }

    const { name, config } = validatedFields.data;
    
    let configJson;
    try {
        configJson = JSON.parse(config);
    } catch (e) {
        return { success: false, message: 'Formato JSON inválido.' };
    }

    let client;
    try {
        const pool = await getDbPool();
        if (!pool) return { success: false, message: 'Error del servidor.' };
        client = await pool.connect();
        const result = await client.query(
            'UPDATE address_services SET name = $1, config_json = $2, updated_at = NOW() WHERE id = $3',
            [name, configJson, id]
        );

        if (result.rowCount === 0) {
            return { success: false, message: "Servicio no encontrado." };
        }
        
        return { success: true, message: `Servicio "${name}" actualizado.` };
    } catch (error) {
        console.error("Error updating address service:", error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}

export async function deleteAddressService(id: string): Promise<ActionState> {
    if (!id) return { success: false, message: "ID no proporcionado." };

    let client;
    try {
        const pool = await getDbPool();
        if (!pool) return { success: false, message: 'Error del servidor.' };
        client = await pool.connect();
        await client.query('DELETE FROM address_services WHERE id = $1', [id]);
        return { success: true, message: 'Servicio de dirección eliminado con éxito.' };
    } catch (error) {
        console.error("Error deleting address service:", error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}

export async function setAddressServiceAsDefault(id: string): Promise<ActionState> {
    if (!id) return { success: false, message: "ID no proporcionado." };

    let client;
    try {
        const pool = await getDbPool();
        if (!pool) return { success: false, message: 'Error del servidor.' };
        client = await pool.connect();
        await client.query('BEGIN');
        await client.query('UPDATE address_services SET is_default = FALSE');
        await client.query('UPDATE address_services SET is_default = TRUE WHERE id = $1', [id]);
        await client.query('COMMIT');
        return { success: true, message: 'Servicio establecido como predeterminado.' };
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error("Error setting default address service:", error);
        return { success: false, message: 'Error del servidor.' };
    } finally {
        if (client) client.release();
    }
}


// --- Data Fetching Action ---

type FetchParams = {
    region?: string;
    region_code?: string;
    country?: string;
    state?: string;
}

export async function fetchAddressData(params: FetchParams): Promise<ActionState<AddressData>> {
    let client;
    let config: any;

    try {
        const pool = await getDbPool();
        if (!pool) {
            return { success: false, message: 'Error del servidor: Pool de DB no disponible.' };
        }
        client = await pool.connect();

        const serviceResult = await client.query('SELECT config_json FROM address_services WHERE is_default = TRUE LIMIT 1');
        if (serviceResult.rows.length === 0) {
            return { success: false, message: 'No se ha configurado un servicio de dirección predeterminado.' };
        }
        config = serviceResult.rows[0].config_json;
    } catch (dbError: any) {
        console.error("Error fetching address service config:", dbError);
        return { success: false, message: `Error de base de datos: ${dbError.message}` };
    } finally {
        if (client) client.release();
    }
    
    let data: AddressData = {};
    const responseConfig = config.response;
    
    if (!responseConfig) {
        return { success: false, message: 'La configuración de respuesta del servicio de dirección es inválida.' };
    }
    
    if (Object.keys(params).length === 0) { // Fetch Regions
        const regionsResult = await fetchDataFromSource('regions', config, params);
        if (!regionsResult.success) {
            return { success: false, message: regionsResult.error || "Error al obtener regiones." };
        }
        
        if (config.request.api_config.parameters.regions?.url) { // URL case
            data.regions = regionsResult.data.map((item: any) => ({
                name: getNestedValue(item, responseConfig.regions.name),
                code: getNestedValue(item, responseConfig.regions.code)
            }));
        } else { // Embedded case
            data.regions = regionsResult.data.value.map((name: string) => ({
                name: name,
                code: regionsResult.data.codes?.[name] || '',
            }));
            data.regionCodeMap = regionsResult.data.codes;
        }

    } else if (params.region || params.region_code) { // Fetch Countries
        const countriesResult = await fetchDataFromSource('countries', config, params);
        if (!countriesResult.success) {
            return { success: false, message: countriesResult.error || "Error al obtener países." };
        }
        data.countries = countriesResult.data.map((item: any) => ({
            name: getNestedValue(item, responseConfig.countries.name),
            cca2: getNestedValue(item, responseConfig.countries.cca2),
            flag: getNestedValue(item, responseConfig.countries.flag),
        })).filter((c:any) => c.name).sort((a: any, b: any) => a.name.localeCompare(b.name));
        
    } else if (params.country && !params.state) { // Fetch States
        const statesResult = await fetchDataFromSource('states', config, params);
        if(!statesResult.success) {
            return { success: false, message: statesResult.error || "Error al obtener estados." };
        }
        data.states = statesResult.data.map((item: any) => ({
            name: getNestedValue(item, responseConfig.states.name)
        })).filter((s:any) => s.name).sort((a: any, b: any) => a.name.localeCompare(b.name));

    } else if (params.country && params.state) { // Fetch Cities
        const citiesResult = await fetchDataFromSource('cities', config, params);
         if(!citiesResult.success) {
            return { success: false, message: citiesResult.error || "Error al obtener ciudades." };
        }
        if (Array.isArray(citiesResult.data)) {
            data.cities = citiesResult.data.sort();
        }
    }
    
    return { success: true, message: 'Datos de dirección obtenidos.', data };
}


export async function testAddressService(id: string): Promise<ActionState> {
    let client;
    let service: AddressService | null = null;
    try {
        const pool = await getDbPool();
        if (!pool) return { success: false, message: "Error del servidor: no se pudo conectar a la base de datos." };
        client = await pool.connect();
        
        const serviceResult = await client.query('SELECT * FROM address_services WHERE id = $1', [id]);
        if (serviceResult.rows.length === 0) throw new Error("Servicio de prueba no encontrado.");
        
        service = serviceResult.rows[0];

    } catch (err: any) {
        console.error("Error during service test (DB fetch):", err);
        return { success: false, message: `Error al obtener la configuración del servicio: ${err.message}` };
    } finally {
        if (client) client.release();
    }

    try {
        const tempConfig = service.config_json;

        // --- STEP 1: Test Regions ---
        const regionsResult = await fetchDataFromSource('regions', tempConfig, {});
        if (!regionsResult.success || !regionsResult.data || regionsResult.data.length === 0) {
             throw new Error(`Prueba de regiones fallida: ${regionsResult.error || 'No se obtuvieron datos de regiones.'}.\n\n--- SALIDA COMPLETA ---\n${JSON.stringify(regionsResult, null, 2)}`);
        }
        
        let firstRegion: AddressDataItem;
        
        if (tempConfig.request.api_config.parameters.regions?.url) { // URL case
            const firstRegionData = regionsResult.data[0];
            firstRegion = {
                name: getNestedValue(firstRegionData, tempConfig.response.regions.name),
                code: getNestedValue(firstRegionData, tempConfig.response.regions.code)
            };
        } else { // Embedded case
            const regionName = regionsResult.data.value[0];
            firstRegion = {
                name: regionName,
                code: regionsResult.data.codes?.[regionName] || ''
            };
        }

        // --- STEP 2: Test Countries ---
        const countriesResult = await fetchDataFromSource('countries', tempConfig, { region: firstRegion.name, region_code: firstRegion.code });
        if (!countriesResult.success || !countriesResult.data || countriesResult.data.length === 0) {
            throw new Error(`Prueba de países fallida para la región '${firstRegion.name}': ${countriesResult.error || 'No se obtuvieron datos de países.'}.\n\n--- SALIDA COMPLETA ---\n${JSON.stringify(countriesResult, null, 2)}`);
        }
        const firstCountry = getNestedValue(countriesResult.data[0], tempConfig.response.countries.name);

        // --- STEP 3: Test States ---
        const statesResult = await fetchDataFromSource('states', tempConfig, { country: firstCountry });
         if (!statesResult.success || !statesResult.data || !Array.isArray(statesResult.data) || statesResult.data.length === 0) {
            throw new Error(`Prueba de estados fallida para el país '${firstCountry}': ${statesResult.error || 'No se obtuvieron datos de estados.'}.\n\n--- SALIDA COMPLETA ---\n${JSON.stringify(statesResult, null, 2)}`);
        }
        const firstState = getNestedValue(statesResult.data[0], tempConfig.response.states.name);

        // --- STEP 4: Test Cities ---
        const citiesResult = await fetchDataFromSource('cities', tempConfig, { country: firstCountry, state: firstState });
         if (!citiesResult.success || !citiesResult.data || !Array.isArray(citiesResult.data) || citiesResult.data.length === 0) {
            throw new Error(`Prueba de ciudades fallida para el estado '${firstState}': ${citiesResult.error || 'No se obtuvieron datos de ciudades.'}.\n\n--- SALIDA COMPLETA ---\n${JSON.stringify(citiesResult, null, 2)}`);
        }
        const firstCity = citiesResult.data[0];

        return { 
            success: true, 
            message: `¡Prueba exitosa!\nRegión: ${firstRegion.name}\nPaís: ${firstCountry}\nEstado: ${firstState}\nCiudad: ${firstCity}`
        };
            
    } catch (err: any) {
        console.error("Error during service test (logic):", err);
        return { success: false, message: `Error durante la prueba: ${err.message}\n\nStack: ${err.stack}` };
    }
}
    





      









    

    