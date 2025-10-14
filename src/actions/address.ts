

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

function getNestedValue(obj: any, path: string): any {
    if (typeof path !== 'string' || !path || path === '.') {
      return obj;
    }
    // Handle cases like "[1]"
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
            // Prioritize valueMap over environment variables
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
        if (!pool) return { success: false, message: 'Error del servidor: Pool de DB no disponible.' };
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
    
    const requestConfig = config.request?.api_config;
    const responseConfig = config.response;
    
    if (!responseConfig) {
        return { success: false, message: 'La configuración de respuesta del servicio de dirección es inválida.' };
    }
    
    // --- REGIONS ---
    if (Object.keys(params).length === 0) {
        const regionsRequestConfig = requestConfig?.parameters?.regions;
        const regionsResponseConfig = responseConfig.regions;

        if (regionsRequestConfig && !regionsRequestConfig.url && regionsResponseConfig?.path) {
            // Case 1: Data is embedded in the JSON config itself
            const regionContainer = getNestedValue(config, regionsResponseConfig.path);
            if (regionContainer && Array.isArray(regionContainer.value)) {
                data.regions = regionContainer.value.map((name: string) => ({
                    name: name,
                    code: regionContainer.codes?.[name] || '',
                }));
                data.regionCodeMap = regionContainer.codes;
            }
        } else if (regionsRequestConfig?.url && regionsResponseConfig?.path) {
            // Case 2: Data needs to be fetched from a URL
            try {
                const url = regionsRequestConfig.url;
                const response = await fetch(url);
                if (!response.ok) {
                    return { success: false, message: `Error al obtener datos de la URL de regiones: El servidor respondió con el estado ${response.status}` };
                }
                const regionsJson = await response.json();
                const regionList = getNestedValue(regionsJson, regionsResponseConfig.path);
                
                if (Array.isArray(regionList)) {
                    data.regions = regionList.map((item: any) => ({
                        name: getNestedValue(item, regionsResponseConfig.name),
                        code: getNestedValue(item, regionsResponseConfig.code)
                    }));
                } else {
                    return { success: false, message: 'Error de configuración: La ruta especificada para regiones no devolvió un array.' };
                }
            } catch (e: any) {
                 return { success: false, message: `Error al obtener datos de la URL de regiones: ${e.message}` };
            }
        }
    }


    // --- COUNTRIES ---
    if ((params.region || params.region_code) && requestConfig?.parameters?.countries?.url) {
        try {
            let urlString = requestConfig.parameters.countries.url;
            
            if (params.region_code) urlString = urlString.replace('$region_code', params.region_code);
            if (params.region) urlString = urlString.replace('$region', params.region);

            const response = await fetch(urlString, { method: 'GET' });
            if (!response.ok) {
                return { success: false, message: `Error al obtener países (URL: ${urlString}). Estado: ${response.status}` };
            }
            const countriesJson = await response.json();
            
            const countriesPath = responseConfig.countries?.path;
            const countryList = getNestedValue(countriesJson, countriesPath);

            if (Array.isArray(countryList)) {
                data.countries = countryList.map((item: any) => ({
                    name: getNestedValue(item, responseConfig.countries.name),
                    cca2: getNestedValue(item, responseConfig.countries.cca2),
                    flag: getNestedValue(item, responseConfig.countries.flag),
                })).filter(c => c.name).sort((a: any, b: any) => a.name.localeCompare(b.name));
            } else {
                 return { success: false, message: `La ruta de países '${countriesPath}' no devolvió un array. (URL: ${urlString})` };
            }
        } catch (e: any) {
            return { success: false, message: `Error de red al obtener países: ${e.message}` };
        }
    }

    // --- STATES ---
    if (params.country && requestConfig?.parameters?.states?.url) {
        const url = requestConfig.parameters.states.url.replace('$country', params.country);
        const body = JSON.stringify({ country: params.country });
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json'}, body });
        const statesJson = await response.json();

        const statesPath = responseConfig.states?.path;
        const stateList = getNestedValue(statesJson, statesPath);
        
        if (Array.isArray(stateList)) {
            data.states = stateList.map((item: any) => ({
                name: getNestedValue(item, responseConfig.states.name)
            })).filter(s => s.name).sort((a: any, b: any) => a.name.localeCompare(b.name));
        }
    }

    // --- CITIES ---
    if (params.country && params.state && requestConfig?.parameters?.cities?.url) {
        const url = requestConfig.parameters.cities.url.replace('$state', params.state);
        const body = JSON.stringify({ country: params.country, state: params.state });
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json'}, body });
        const citiesJson = await response.json();
        
        const citiesPath = responseConfig.cities?.path;
        const rawCities = getNestedValue(citiesJson, citiesPath);
        if (Array.isArray(rawCities)) {
            data.cities = rawCities.sort();
        }
    }
    
    return { success: true, message: 'Datos de dirección obtenidos.', data };
}


export async function testAddressService(id: string): Promise<ActionState> {
    let originalDefaultId: string | null = null;
    let client;
    
    try {
        const pool = await getDbPool();
        if (!pool) return { success: false, message: "Error del servidor: no se pudo conectar a la base de datos." };
        client = await pool.connect();
        
        const servicesResult = await client.query('SELECT id, is_default FROM address_services');
        if (servicesResult.rows.length === 0) throw new Error("No hay servicios de dirección configurados.");
        
        const serviceToTest = servicesResult.rows.find(r => r.id === id);
        if (!serviceToTest) throw new Error("Servicio de prueba no encontrado.");
        
        originalDefaultId = servicesResult.rows.find(r => r.is_default)?.id || null;

        if (id !== originalDefaultId) {
            await client.query('BEGIN');
            await client.query('UPDATE address_services SET is_default = FALSE');
            await client.query('UPDATE address_services SET is_default = TRUE WHERE id = $1', [id]);
            await client.query('COMMIT');
        }
        
        // --- STEP 1: Test Regions ---
        const regionsResult = await fetchAddressData({});
        if (!regionsResult.success || !Array.isArray(regionsResult.data?.regions) || regionsResult.data.regions.length === 0) {
            const debugOutput = JSON.stringify(regionsResult, null, 2);
            throw new Error(`Prueba de regiones fallida: data.regions no es un array o está vacío.\n\n--- SALIDA COMPLETA ---\n${debugOutput}`);
        }
        const firstRegion = regionsResult.data.regions[0];

        // --- STEP 2: Test Countries ---
        const countriesResult = await fetchAddressData({ region: firstRegion.name, region_code: firstRegion.code });
        if (!countriesResult.success || !countriesResult.data?.countries || countriesResult.data.countries.length === 0) {
            const debugOutput = JSON.stringify(countriesResult, null, 2);
            throw new Error(`Prueba de países fallida para la región '${firstRegion.name}'.\n\n--- SALIDA COMPLETA ---\n${debugOutput}`);
        }
        const firstCountry = countriesResult.data.countries[0];

        // --- STEP 3: Test States ---
        const statesResult = await fetchAddressData({ country: firstCountry.name });
         if (!statesResult.success || !statesResult.data?.states || statesResult.data.states.length === 0) {
            const debugOutput = JSON.stringify(statesResult, null, 2);
            throw new Error(`Prueba de estados fallida para el país '${firstCountry.name}'.\n\n--- SALIDA COMPLETA ---\n${debugOutput}`);
        }
        const firstState = statesResult.data.states[0];

        // --- STEP 4: Test Cities ---
        const citiesResult = await fetchAddressData({ country: firstCountry.name, state: firstState.name });
         if (!citiesResult.success || !citiesResult.data?.cities || citiesResult.data.cities.length === 0) {
            const debugOutput = JSON.stringify(citiesResult, null, 2);
            throw new Error(`Prueba de ciudades fallida para el estado '${firstState.name}'.\n\n--- SALIDA COMPLETA ---\n${debugOutput}`);
        }
        const firstCity = citiesResult.data.cities[0];

        return { 
            success: true, 
            message: `¡Prueba exitosa!\nRegión: ${firstRegion.name}\nPaís: ${firstCountry.name}\nEstado: ${firstState.name}\nCiudad: ${firstCity}`
        };
            
    } catch (err: any) {
        return { success: false, message: `Error durante la prueba: ${err.message}` };
    } finally {
        if (client && id !== originalDefaultId && originalDefaultId) {
            try { 
                await client.query('BEGIN');
                await client.query('UPDATE address_services SET is_default = FALSE');
                await client.query('UPDATE address_services SET is_default = TRUE WHERE id = $1', [originalDefaultId]);
                await client.query('COMMIT');
            } catch (e) { /* ignore rollback error */ }
        }
        if (client) client.release();
    }
}
    





      