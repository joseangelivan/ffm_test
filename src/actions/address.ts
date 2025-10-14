

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

        let paramValue: string | undefined = undefined;

        if (typeof rawValue === 'string' && rawValue.startsWith('$')) {
            const varName = rawValue.substring(1);
            if (varName in valueMap) {
              paramValue = valueMap[varName]?.toString();
            } else {
              paramValue = env[varName];
            }
        } else {
            paramValue = rawValue?.toString();
        }
        
        if (paramValue || !isOptional) {
             urlParams.append(key, paramValue || '');
        }
    }
    
    return `${base_url}?${urlParams.toString()}`;
}

type FetchParams = {
    region?: string;
    region_code?: string;
    country?: string;
    state?: string;
}

// --- NEW DEDICATED FETCH FUNCTIONS ---

async function fetchRegions(config: any): Promise<{ success: boolean, data?: any, error?: string, regionCodeMap?: any }> {
    const requestConfig = config.request?.api_config?.parameters?.regions;
    const responseConfig = config.response?.regions;
    if (!requestConfig) return { success: true, data: [] };

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
            return { success: true, data: mappedData };
        } catch (e: any) {
            return { success: false, error: `Error en la API de 'regions': ${e.message}` };
        }
    } else if (requestConfig.value) {
        const mappedData = requestConfig.value.map((name: string) => ({
            name: name,
            code: requestConfig.codes?.[name] || ''
        }));
        return { success: true, data: mappedData, regionCodeMap: requestConfig.codes };
    }
    return { success: true, data: [] };
}

async function fetchCountries(config: any, params: FetchParams): Promise<{ success: boolean, data?: any, error?: string, debug?: any }> {
    const requestConfig = config.request?.api_config;
    const countriesRequestConfig = requestConfig?.parameters?.countries;
    const responseConfig = config.response?.countries;
    
    if (!countriesRequestConfig || !countriesRequestConfig.url) {
        if (countriesRequestConfig?.value && params.region) {
            return { success: true, data: countriesRequestConfig.value[params.region]?.countries || [] };
        }
        return { success: true, data: [] };
    }

    const { url, method = 'GET', headers = {} } = countriesRequestConfig;
    const countryUrl = new URL(url);
    const urlParams = new URLSearchParams(countryUrl.search);

    for (const [key, value] of urlParams.entries()) {
        if (value.startsWith('$')) {
            const varName = value.substring(1) as keyof FetchParams;
            if (varName === 'region_code' && params.region_code) {
                urlParams.set(key, params.region_code);
            } else if (varName === 'region' && params.region) {
                urlParams.set(key, params.region);
            } else {
                 const envVar = process.env[value.substring(1)];
                 if (envVar) {
                     urlParams.set(key, envVar);
                 } else {
                     urlParams.delete(key); // Remove if no value is found
                 }
            }
        }
    }

    const finalUrlString = `${countryUrl.origin}${countryUrl.pathname}?${urlParams.toString()}`;
    const curlCommand = `curl -X ${method} '${finalUrlString}'`;

    try {
        const response = await fetch(finalUrlString, { method, headers, cache: 'no-store' });
        const responseText = await response.text();
        
        let jsonResponse;
        try {
            jsonResponse = JSON.parse(responseText);
        } catch (e) {
             return { success: false, error: `Error en la API de 'countries': La respuesta no es un JSON válido.`, debug: { curl: curlCommand, url: finalUrlString, response: responseText } };
        }

        if (!response.ok) {
             return { success: false, error: `El servidor respondió con el estado ${response.status}`, debug: { curl: curlCommand, url: finalUrlString, response: jsonResponse } };
        }

        const dataList = getNestedValue(jsonResponse, responseConfig.path);
        
        if (!Array.isArray(dataList)) {
            return { success: false, error: `La respuesta de la API no contenía un array en la ruta '${responseConfig.path}'.`, debug: { curl: curlCommand, url: finalUrlString, response: jsonResponse } };
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

        
        return { success: true, data: mappedData, debug: { curl: curlCommand, url: finalUrlString, response: jsonResponse } };
    } catch (e: any) {
        return { success: false, error: `Error en la API de 'countries': ${e.message}`, debug: { curl: curlCommand, url: finalUrlString } };
    }
}


async function fetchStates(config: any, params: FetchParams): Promise<{ success: boolean, data?: any, error?: string }> {
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
                throw new Error(`La respuesta de la API no contiene un array de estados en '${responseConfig.path}'. Respuesta: ${JSON.stringify(jsonResponse)}`);
            }

            const mappedData = dataList.map((item: any) => ({
                name: getNestedValue(item, responseConfig.name),
                code: getNestedValue(item, responseConfig.code)
            }));
            
            return { success: true, data: mappedData };

        } catch (e: any) {
            return { success: false, error: `Error en la API de 'states': ${e.message}` };
        }
    } else if (requestConfig.value && params.country && requestConfig.value[params.country]) {
        return { success: true, data: requestConfig.value[params.country].states || [] };
    }
    return { success: true, data: [] };
}


async function fetchCities(config: any, params: FetchParams): Promise<{ success: boolean, data?: any, error?: string }> {
    const requestConfig = config.request?.api_config?.parameters?.cities || config.request?.api_config?.parameters?.countries?.states?.cities;
    if (!requestConfig) return { success: true, data: [] };

    if (requestConfig.value && params.country && params.state) {
        const cities = requestConfig.value[params.country]?.cities?.[params.state] || [];
        return { success: true, data: cities };
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
    
    if (Object.keys(params).length === 0) {
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
        if (!result.success) return { success: false, message: result.error! };
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

        // --- STEP 1: Test Regions ---
        const regionsResult = await fetchRegions(tempConfig);
        if (!regionsResult.success || !Array.isArray(regionsResult.data) || regionsResult.data.length === 0) {
             throw new Error(`Prueba de regiones fallida: ${regionsResult.error || 'data.regions no es un array o está vacío.'}.\n\n--- SALIDA COMPLETA ---\n${JSON.stringify(regionsResult, null, 2)}`);
        }
        
        const testRegion = regionsResult.data.find(r => r.name.toLowerCase().includes('america') || r.name.toLowerCase().includes('latam')) || regionsResult.data[0];
        if (!testRegion) {
             throw new Error('No se encontró una región adecuada para la prueba (se buscó "america" o "latam").');
        }

        // --- STEP 2: Test Countries ---
        const countriesResult = await fetchCountries(tempConfig, { region: testRegion.name, region_code: testRegion.code });
        if (!countriesResult.success || !countriesResult.data || countriesResult.data.length === 0) {
            throw new Error(`Prueba de países fallida para la región '${testRegion.name}': ${countriesResult.error || 'No se obtuvieron datos de países.'}.\n\n--- SALIDA COMPLETA ---\n${JSON.stringify(countriesResult, null, 2)}`);
        }
        const firstCountry = countriesResult.data[0];

        // --- STEP 3: Test States ---
        const statesResult = await fetchStates(tempConfig, { country: firstCountry.name });
         if (!statesResult.success || !statesResult.data || !Array.isArray(statesResult.data) || statesResult.data.length === 0) {
            throw new Error(`Prueba de estados fallida para el país '${firstCountry.name}': ${statesResult.error || 'No se obtuvieron datos de estados.'}.\n\n--- SALIDA COMPLETA ---\n${JSON.stringify(statesResult, null, 2)}`);
        }
        const firstState = statesResult.data[0];

        // --- STEP 4: Test Cities ---
        const citiesResult = await fetchCities(tempConfig, { country: firstCountry.name, state: firstState.name });
         if (!citiesResult.success || !citiesResult.data || !Array.isArray(citiesResult.data) || citiesResult.data.length === 0) {
            throw new Error(`Prueba de ciudades fallida para el estado '${firstState.name}': ${citiesResult.error || 'No se obtuvieron datos de ciudades.'}.\n\n--- SALIDA COMPLETA ---\n${JSON.stringify(citiesResult, null, 2)}`);
        }
        const firstCity = citiesResult.data[0];

        return { 
            success: true, 
            message: `¡Prueba exitosa!\nRegión: ${testRegion.name}\nPaís: ${firstCountry.name}\nEstado: ${firstState.name}\nCiudad: ${firstCity}`
        };
            
    } catch (err: any) {
        console.error("Error during service test (logic):", err);
        return { success: false, message: `Error durante la prueba: ${err.message}` };
    }
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
        
        const results = getNestedValue(responseData, config.response.results_path);
        
        if (!Array.isArray(results)) {
            return { success: false, message: "No se encontraron resultados en la ruta especificada." };
        }
        
        const suggestions = results.map(r => ({
            address: getNestedValue(r, config.response.address_path),
            lat: parseFloat(getNestedValue(r, config.response.lat_path)),
            lon: parseFloat(getNestedValue(r, config.response.lon_path)),
        })).filter(s => s.address && !isNaN(s.lat) && !isNaN(s.lon));
        
        return { success: true, message: "Sugerencias obtenidas.", data: suggestions };

    } catch (error: any) {
        console.error("Error in autocompleteAddress:", error);
        return { success: false, message: `Error: ${error.message}` };
    } finally {
        if(client) client.release();
    }
}


export async function geocodeAddress(fullAddress: string): Promise<ActionState<any>> {
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
        
        let config: any;
        if (typeof defaultService.config_json === 'string') {
            try {
                config = JSON.parse(defaultService.config_json);
            } catch(e: any) {
                return { success: false, message: `Error interno al procesar la configuración JSON: ${e.message}` };
            }
        } else {
            config = defaultService.config_json;
        }

        const requestConfig = config?.geocoordinates?.request || config?.request;
        const responseConfig = config?.geocoordinates?.response || config?.response;

        if (!requestConfig?.api_config?.base_url || typeof requestConfig?.api_config?.parameters !== 'object') {
            return { success: false, message: "No se pudo construir la URL de la API a partir del JSON. Verifica las claves 'base_url' y 'parameters'." };
        }

        const finalUrl = buildApiUrl(requestConfig.api_config, { 'Address': fullAddress }, process.env);
        const response = await fetch(finalUrl, { cache: 'no-store' });
        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(`La API respondió con el estado ${response.status}`);
        }
        
        const lat = parseFloat(getNestedValue(responseData, responseConfig.lat));
        const lon = parseFloat(getNestedValue(responseData, responseConfig.lon));

        if (!isNaN(lat) && !isNaN(lon)) {
            return { success: true, data: { lat, lon }, message: "Dirección encontrada." };
        } else {
            return { success: false, message: "No se pudieron extraer coordenadas válidas de la respuesta de la API.", data: null };
        }

    } catch (error: any) {
        console.error("Error geocoding address:", error);
        return { success: false, message: 'Error de servidor al geocodificar la dirección.' };
    } finally {
        if (client) client.release();
    }
}
