
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
    if (path === undefined || path === null || path === '.' || path === '') {
      return obj;
    }
    
    // Check if the path is an array index like "[1]"
    const arrayIndexMatch = path.match(/^\[(\d+)\]$/);
    if (arrayIndexMatch) {
        const index = parseInt(arrayIndexMatch[1], 10);
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
    let finalUrlString = apiConfig.base_url;
    
    // Replace placeholders in the base_url itself
    for (const [key, value] of Object.entries(valueMap)) {
      if (typeof value === 'string') {
        finalUrlString = finalUrlString.replace(`$${key}`, encodeURIComponent(value));
      }
    }
    
    const urlParams = new URLSearchParams();

    for (const [key, paramConfig] of Object.entries(apiConfig.parameters || {})) {
        let rawValue: any;
        let isOptional = false;

        if (typeof paramConfig === 'object' && paramConfig !== null && 'value' in paramConfig) {
            rawValue = paramConfig.value;
            isOptional = paramConfig.optional === true;
        } else {
            rawValue = paramConfig;
        }

        let paramValue: string | undefined = undefined;

        if (typeof rawValue === 'string' && rawValue.startsWith('$')) {
            const varName = rawValue.substring(1);
            if (varName in valueMap && valueMap[varName]) {
              paramValue = valueMap[varName]?.toString();
            } else if (env[varName]){
              paramValue = env[varName];
            }
        } else {
            paramValue = rawValue?.toString();
        }
        
        if (paramValue || !isOptional) {
             urlParams.append(key, paramValue || '');
        }
    }
    
    const paramsString = urlParams.toString();
    if (paramsString) {
        return `${finalUrlString}?${paramsString}`;
    }
    return finalUrlString;
}

type FetchParams = {
    region?: string;
    region_code?: string;
    country?: string;
    state?: string;
    city?: string;
    regionCodeMap?: Record<string, string>;
}

// --- NEW DEDICATED FETCH FUNCTIONS ---

async function fetchRegions(config: any): Promise<{ success: boolean, data?: any, error?: string, regionCodeMap?: any }> {
    const requestConfig = config.request?.api_config?.parameters?.regions;
    const responseConfig = config.response?.regions;
    if (!requestConfig) return { success: true, data: [], regionCodeMap: {} };

    if (requestConfig.url) {
        try {
            const response = await fetch(requestConfig.url, { cache: 'no-store' });
            if (!response.ok) throw new Error(`El servidor respondió con el estado ${response.status}`);
            const jsonResponse = await response.json();
            const dataList = getNestedValue(jsonResponse, responseConfig.path);

            const mappedData = dataList.map((item: any) => ({
                name: getNestedValue(item, responseConfig.name),
                code: getNestedValue(item, responseConfig.code)
            }));
            
            const regionCodeMap = mappedData.reduce((acc: any, item: any) => {
                if (item.name) {
                    acc[item.name] = item.code || "";
                }
                return acc;
            }, {});

            return { success: true, data: mappedData, regionCodeMap };
        } catch (e: any) {
            return { success: false, error: `Error en la API de 'regions': ${e.message}` };
        }
    } else if (requestConfig.value) {
        const mappedData = requestConfig.value.map((name: string) => ({
            name: name,
            code: requestConfig.codes?.[name] || ""
        }));
        
        const regionCodeMap = mappedData.reduce((acc: Record<string, string>, name: string) => {
            acc[name] = requestConfig.codes?.[name] || "";
            return acc;
        }, {});

        return { success: true, data: mappedData, regionCodeMap };
    }
    return { success: true, data: [], regionCodeMap: {} };
}

async function fetchCountries(config: any, params: FetchParams): Promise<{ success: boolean, data?: any, error?: string, debug?: any }> {
    const apiConfig = config.request?.api_config;
    const countriesConfig = apiConfig?.parameters?.countries;
    const responseConfig = config.response?.countries;
    const baseDebugInfo = {
        'region_received': params.region,
        'region_code_received': params.region_code,
        'region_code_map_received': params.regionCodeMap,
        'curl': '',
    };
    
    if (!countriesConfig || !countriesConfig.url) {
        if (countriesConfig?.value && params.region) {
            return { success: true, data: countriesConfig.value[params.region]?.countries || [] };
        }
        return { success: true, data: [] };
    }
    
    const { method = 'GET', headers = {} } = countriesConfig;
    
    let finalUrlString = countriesConfig.url;
    if (finalUrlString.includes('$region_code') && params.region_code) {
        finalUrlString = finalUrlString.replace(/\$region_code/g, encodeURIComponent(params.region_code));
    }
    if (finalUrlString.includes('$region') && params.region) {
        finalUrlString = finalUrlString.replace(/\$region/g, encodeURIComponent(params.region));
    }

    const finalUrl = new URL(finalUrlString);
    
    const curlCommand = `curl -X ${method} '${finalUrl.toString()}'`;
    const debugInfo = { 
        ...baseDebugInfo,
        'curl': curlCommand,
    };

    try {
        const response = await fetch(finalUrl.toString(), { method, headers, cache: 'no-store' });
        const responseText = await response.text();
        
        if (!response.ok) {
            let errorResponse;
            try { errorResponse = JSON.parse(responseText); } catch { errorResponse = responseText; }
             return { success: false, error: `El servidor respondió con el estado ${response.status}`, debug: { ...debugInfo, response: errorResponse } };
        }
        
        let jsonResponse;
        try {
            jsonResponse = JSON.parse(responseText);
        } catch (e) {
             return { success: false, error: `La respuesta de la API de 'countries' no es un JSON válido.`, debug: { ...debugInfo, response: responseText } };
        }

        const dataList = getNestedValue(jsonResponse, responseConfig.path);
        
        if (!Array.isArray(dataList)) {
            return { success: false, error: `La respuesta de la API no contenía un array en la ruta '${responseConfig.path}'.`, debug: { ...debugInfo, response: jsonResponse } };
        }
        
        const mappedData = dataList.map((item: any) => {
            const countryData: AddressDataItem = {
                name: getNestedValue(item, responseConfig.name),
                cca2: getNestedValue(item, responseConfig.cca2),
            };

            const flagConfig = responseConfig.flag;
            if (flagConfig && Array.isArray(flagConfig) && flagConfig.length > 0) {
                 const flagPath = flagConfig.join('.');
                if(flagPath) {
                    countryData.flag = getNestedValue(item, flagPath);
                }
            }
            
            return countryData;
        }).filter(c => c.name);

        
        return { success: true, data: mappedData, debug: { ...debugInfo, response: jsonResponse } };
    } catch (e: any) {
        return { success: false, error: `Error en la API de 'countries': ${e.message}`, debug: debugInfo };
    }
}


async function fetchStates(config: any, params: FetchParams): Promise<{ success: boolean, data?: any, error?: string, debug?: any }> {
    const requestConfig = config.request?.api_config?.parameters?.states || config.request?.api_config?.parameters?.countries?.states;
    const responseConfig = config.response?.states || config.response?.countries?.states;

    if (!requestConfig) return { success: true, data: [] };

    if (requestConfig.url) {
        try {
            const body: { [key: string]: any } = {};
            if (requestConfig.body) {
                for (const key in requestConfig.body) {
                    const value = requestConfig.body[key];
                    if (typeof value === 'string' && value.startsWith('$')) {
                        const paramName = value.substring(1) as keyof FetchParams;
                        if (paramName in params) {
                            body[key] = params[paramName as keyof FetchParams];
                        }
                    } else {
                        body[key] = value;
                    }
                }
            }

            const fetchOptions: RequestInit = {
                method: requestConfig.method || 'POST',
                headers: { ...requestConfig.headers },
                cache: 'no-store'
            };

            if (Object.keys(body).length > 0 && fetchOptions.method !== 'GET' && fetchOptions.method !== 'HEAD') {
                fetchOptions.body = JSON.stringify(body);
                (fetchOptions.headers as any)['Content-Type'] = 'application/json';
            }
            
            const response = await fetch(requestConfig.url, fetchOptions);
            const jsonResponse = await response.json();

            if (!response.ok) {
                 throw new Error(`El servidor respondió con el estado ${response.status}. Respuesta: ${JSON.stringify(jsonResponse)}`);
            }

            const dataList = getNestedValue(jsonResponse, responseConfig.path);
            
            if (!Array.isArray(dataList)) {
                // For countriesnow, if no states, it returns an empty data object not an array
                if (dataList && Object.keys(dataList).length === 0) {
                     return { success: true, data: [] };
                }
                throw new Error(`La respuesta de la API no contiene un array de estados en '${responseConfig.path}'. Respuesta: ${JSON.stringify(jsonResponse)}`);
            }

            const mappedData = dataList.map((item: any) => ({
                name: getNestedValue(item, responseConfig.name),
                code: getNestedValue(item, responseConfig.code)
            }));
            
            return { success: true, data: mappedData };

        } catch (e: any) {
            return { success: false, error: `Error en la API de 'states': ${e.message}`, debug: { response: e.toString() } };
        }
    } else if (requestConfig.value && params.country && requestConfig.value[params.country]) {
        return { success: true, data: requestConfig.value[params.country].states || [] };
    }
    return { success: true, data: [] };
}


async function fetchCities(config: any, params: FetchParams): Promise<{ success: boolean, data?: any, error?: string }> {
    const requestConfig = config.request?.api_config?.parameters?.cities || config.request?.api_config?.parameters?.countries?.states?.cities;
    const responseConfig = config.response?.cities;

    if (!requestConfig) return { success: true, data: [] };

    if (requestConfig.value && params.country && params.state) {
        const cities = requestConfig.value[params.country]?.cities?.[params.state] || [];
        return { success: true, data: cities };
    }
     if (requestConfig.url) {
        try {
            const body: { [key: string]: any } = {};
            if (requestConfig.body) {
                for (const key in requestConfig.body) {
                    const value = requestConfig.body[key];
                    if (typeof value === 'string' && value.startsWith('$')) {
                        const paramName = value.substring(1) as keyof FetchParams;
                        if (paramName in params) {
                            body[key] = params[paramName as keyof FetchParams];
                        }
                    } else {
                        body[key] = value;
                    }
                }
            }

            const fetchOptions: RequestInit = {
                method: requestConfig.method || 'POST',
                headers: { ...requestConfig.headers },
                cache: 'no-store'
            };

            if (Object.keys(body).length > 0 && fetchOptions.method !== 'GET' && fetchOptions.method !== 'HEAD') {
                fetchOptions.body = JSON.stringify(body);
                (fetchOptions.headers as any)['Content-Type'] = 'application/json';
            }
            
            const response = await fetch(requestConfig.url, fetchOptions);

            const jsonResponse = await response.json();

            if (!response.ok) {
                 throw new Error(`El servidor respondió con el estado ${response.status}. Respuesta: ${JSON.stringify(jsonResponse)}`);
            }
            
            if (!responseConfig) {
                 throw new Error(`responseConfig is not defined`);
            }

            const dataList = getNestedValue(jsonResponse, responseConfig.path);
            
            if (!Array.isArray(dataList)) {
                 if (dataList && Object.keys(dataList).length === 0) {
                     return { success: true, data: [] };
                }
                throw new Error(`La respuesta de la API no contiene un array de ciudades en '${responseConfig.path}'. Respuesta: ${JSON.stringify(jsonResponse)}`);
            }

            if (responseConfig.name && responseConfig.name === '.') {
                return { success: true, data: dataList };
            }

            if(Array.isArray(dataList) && dataList.every(item => typeof item === 'string')) {
                return { success: true, data: dataList };
            }
            
            const mappedData = dataList.map(item => getNestedValue(item, responseConfig.name)).filter(Boolean);

            return { success: true, data: mappedData };

        } catch (e: any) {
            return { success: false, error: `Error en la API de 'cities': ${e.message}` };
        }
    }
    
    return { success: true, data: [] };
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

export async function fetchAddressData(params: FetchParams): Promise<ActionState<AddressData> & { debug?: any }> {
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
    let result: { success: boolean, data?: any, error?: string, regionCodeMap?: any, debug?: any };
    
    if (Object.keys(params).length === 0 || (!params.region && !params.country && !params.state)) {
        result = await fetchRegions(config);
        if (!result.success) return { success: false, message: result.error! };
        data.regions = result.data;
        data.regionCodeMap = result.regionCodeMap;
    } else if (params.region || params.region_code) {
        result = await fetchCountries(config, params);
        if (!result.success) {
            return { success: false, message: result.error!, debug: result.debug };
        }
        data.countries = result.data?.filter((c:any) => c.name).sort((a: any, b: any) => a.name.localeCompare(b.name));
        return { success: true, message: 'Datos de dirección obtenidos.', data, debug: result.debug };
    } else if (params.country && !params.state) {
        result = await fetchStates(config, params);
        if (!result.success) return { success: false, message: result.error!, debug: result.debug };
        data.states = result.data.filter((s:any) => s.name).sort((a: any, b: any) => a.name.localeCompare(b.name));
    } else if (params.country && params.state) {
        result = await fetchCities(config, params);
        if (!result.success) return { success: false, message: result.error! };
        if(Array.isArray(result.data)) data.cities = result.data.sort();
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
        const StringRegionTest = "america";
        const StringRegionTest2 = "latin";
        const StringCountryTest = "Brazil";

        // --- STEP 1: Test Regions ---
        const regionsResult = await fetchRegions(tempConfig);
        if (!regionsResult.success || !Array.isArray(regionsResult.data) || regionsResult.data.length === 0) {
             throw new Error(`Prueba de regiones fallida: ${regionsResult.error || 'data.regions no es un array o está vacío.'}.\n\n--- SALIDA COMPLETA ---\n${JSON.stringify(regionsResult, null, 2)}`);
        }
        
        const testRegion = 
            regionsResult.data.find(r => r.name.toLowerCase().includes(StringRegionTest) && r.name.toLowerCase().includes(StringRegionTest2)) ||
            regionsResult.data.find(r => r.name.toLowerCase().includes(StringRegionTest)) || 
            regionsResult.data[0];

        if (!testRegion) {
             throw new Error('No se encontró una región adecuada para la prueba (se buscó "america" o "latam").');
        }

        // --- STEP 2: Test Countries ---
        const regionCode = regionsResult.regionCodeMap?.[testRegion.name];
        const countriesResult = await fetchCountries(tempConfig, { 
            region: testRegion.name, 
            region_code: regionCode, 
            regionCodeMap: regionsResult.regionCodeMap 
        });

        if (!countriesResult.success || !countriesResult.data || countriesResult.data.length === 0) {
            throw new Error(`Prueba de países fallida para la región '${testRegion.name}': ${countriesResult.error || 'No se obtuvieron datos de países.'}.\n\n--- SALIDA COMPLETA ---\n${JSON.stringify(countriesResult, null, 2)}`);
        }
        
        const testCountry = countriesResult.data.find((c: any) => c.name.toLowerCase() === StringCountryTest.toLowerCase()) || countriesResult.data[0];

        // --- STEP 3: Test States ---
        const statesResult = await fetchStates(tempConfig, { country: testCountry.name });
         if (!statesResult.success || !Array.isArray(statesResult.data)) {
            throw new Error(`Prueba de estados fallida para el país '${testCountry.name}': ${statesResult.error || 'No se obtuvieron datos de estados.'}.\n\n--- SALIDA COMPLETA ---\n${JSON.stringify(statesResult, null, 2)}`);
        }
        if (statesResult.data.length === 0) {
            return { 
                success: true, 
                message: `¡Prueba parcialmente exitosa!\nRegión: ${testRegion.name}\nPaís: ${testCountry.name}\nEl país no tiene estados, la prueba se detuvo aquí.`
            };
        }
        const firstState = statesResult.data[0];

        // --- STEP 4: Test Cities ---
        const citiesResult = await fetchCities(tempConfig, { country: testCountry.name, state: firstState.name });
         if (!citiesResult.success || !Array.isArray(citiesResult.data) || citiesResult.data.length === 0) {
            throw new Error(`Prueba de ciudades fallida para el estado '${firstState.name}': ${citiesResult.error || 'No se obtuvieron datos de ciudades.'}.\n\n--- SALIDA COMPLETA ---\n${JSON.stringify(citiesResult, null, 2)}`);
        }
        const firstCity = citiesResult.data[0];

        return { 
            success: true, 
            message: `¡Prueba exitosa!\nRegión: ${testRegion.name}\nPaís: ${testCountry.name}\nEstado: ${firstState.name}\nCiudad: ${firstCity}`
        };
            
    } catch (err: any) {
        console.error("Error during service test (logic):", err);
        return { success: false, message: `Error durante la prueba: ${err.message}` };
    }
}

    