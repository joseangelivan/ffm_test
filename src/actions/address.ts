
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
    if (path === '' || path === '.') {
        return obj;
    }
    const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    let result = obj;
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (result === null || result === undefined) {
            console.error(`getNestedValue failed: parent object is null or undefined at path segment "${keys.slice(0, i).join('.')}" when trying to access "${key}".`);
            return undefined;
        }
        result = result[key];
        if (result === undefined) {
            console.error(`getNestedValue failed: value is undefined at path segment "${keys.slice(0, i + 1).join('.')}".`);
            return undefined;
        }
    }
    return result;
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
    try {
        const pool = await getDbPool();
        if (!pool) return { success: false, message: 'Error del servidor.' };
        client = await pool.connect();

        const serviceResult = await client.query('SELECT config_json FROM address_services WHERE is_default = TRUE LIMIT 1');
        if (serviceResult.rows.length === 0) {
            return { success: false, message: 'No se ha configurado un servicio de dirección predeterminado.' };
        }
        const config = serviceResult.rows[0].config_json;

        const requestConfig = config.request?.api_config;
        const responseConfig = config.response;
        
        if (!responseConfig) {
            return { success: false, message: 'La configuración de respuesta del servicio de dirección es inválida.' };
        }
        
        let data: AddressData = {};
        
        const regionsResponseConfig = responseConfig.regions;
        if (regionsResponseConfig && regionsResponseConfig.path && regionsResponseConfig.name) {
            const baseObject = getNestedValue(config, regionsResponseConfig.path);
            
            if (baseObject && typeof baseObject === 'object') {
                const regionList = baseObject[regionsResponseConfig.name];
                
                if (Array.isArray(regionList)) {
                    let regionCodes: string[] = [];
                     const regionCodeConfigPath = config.request?.api_config?.parameters?.regions?.code;
                     if(regionCodeConfigPath) {
                        const codeObject = getNestedValue(config, regionCodeConfigPath);
                        if (codeObject && codeObject[regionsResponseConfig.name] && Array.isArray(codeObject[regionsResponseConfig.name])) {
                           regionCodes = codeObject[regionsResponseConfig.name];
                       }
                     }
                    
                    data.regions = regionList.map((item: any, index: number) => {
                        const name = typeof item === 'object' && item !== null ? item.name : item;
                        const codeValue = regionCodes[index] || '';
                        return { name: name, code: codeValue };
                    }).filter(r => r.name);

                    data.regionCodeMap = data.regions.reduce((acc, curr) => {
                        if (curr.name) acc[curr.name] = curr.code || '';
                        return acc;
                    }, {} as Record<string, string>);
                }
            }
        }


        // --- COUNTRIES ---
        if ((params.region || params.region_code) && requestConfig?.parameters?.countries?.url) {
            let urlString = requestConfig.parameters.countries.url;
            
            if (params.region_code) urlString = urlString.replace('$region_code', params.region_code);
            if (params.region) urlString = urlString.replace('$region', params.region);

            const response = await fetch(urlString, { method: 'GET' });
            const countriesJson = await response.json();
            
            const countriesPath = responseConfig.countries?.path;
            const countryList = getNestedValue(countriesJson, countriesPath);

            if (Array.isArray(countryList)) {
                data.countries = countryList.map((item: any) => ({
                    name: getNestedValue(item, responseConfig.countries.name),
                    cca2: getNestedValue(item, responseConfig.countries.cca2),
                    flag: getNestedValue(item, responseConfig.countries.flag),
                })).filter(c => c.name).sort((a: any, b: any) => a.name.localeCompare(b.name));
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

    } catch (error: any) {
        console.error("Error fetching address data:", error);
        return { success: false, message: 'Error del servidor al obtener los datos de dirección.' };
    } finally {
        if (client) client.release();
    }
}


export async function testAddressService(id: string): Promise<ActionState> {
    if (!id) return { success: false, message: "ID de servicio no proporcionado." };

    let client;
    try {
        const pool = await getDbPool();
        if (!pool) return { success: false, message: "Error del servidor." };
        client = await pool.connect();
        
        await client.query('BEGIN');

        // Get current default service ID
        const originalDefaultResult = await client.query('SELECT id FROM address_services WHERE is_default = TRUE');
        const originalDefaultId = originalDefaultResult.rows[0]?.id;

        // Temporarily set the service to test as default if it's not already
        if (id !== originalDefaultId) {
            await client.query('UPDATE address_services SET is_default = FALSE');
            await client.query('UPDATE address_services SET is_default = TRUE WHERE id = $1', [id]);
        }
        
        let testError: Error | null = null;
        try {
            // STEP 1: Test Regions
            const regionsResult = await fetchAddressData({});
            if (!regionsResult.success) {
                throw new Error(`Prueba de regiones fallida: ${regionsResult.message}. Resultado: ${JSON.stringify(regionsResult)}`);
            }
            if (!regionsResult.data?.regions) {
                 throw new Error(`Prueba de regiones fallida: fetchAddressData tuvo éxito pero no devolvió datos en data.regions. Resultado: ${JSON.stringify(regionsResult)}`);
            }
            if (!Array.isArray(regionsResult.data.regions)) {
                throw new Error(`Prueba de regiones fallida: se esperaba un array en data.regions, pero se obtuvo un ${typeof regionsResult.data.regions}.`);
            }
             if (regionsResult.data.regions.length === 0) {
                 throw new Error(`Prueba de regiones fallida: data.regions es un array vacío. Resultado: ${JSON.stringify(regionsResult)}`);
            }
            
            const firstRegion = regionsResult.data.regions[0];
            console.log(`Prueba de Regiones exitosa. Primer continente encontrado: ${firstRegion.name}`);

            // STEP 2: Test Countries
            const regionCodeMap = regionsResult.data.regionCodeMap || {};
            const regionCode = regionCodeMap[firstRegion.name] || '';
            
            const countriesResult = await fetchAddressData({ region: firstRegion.name, region_code: regionCode });
            if (!countriesResult.success || !countriesResult.data?.countries || countriesResult.data.countries.length === 0) {
                let debugMessage = `Resultado: ${JSON.stringify(countriesResult, null, 2)}`;
                if (countriesResult?.data) {
                    const countryListRaw = getNestedValue(countriesResult.data, '.');
                    if(Array.isArray(countryListRaw) && countryListRaw.length > 0) {
                         debugMessage += `\nPrimer elemento de la respuesta de países: ${JSON.stringify(countryListRaw[0], null, 2)}`;
                    } else if (typeof countriesResult.data === 'object' && Object.keys(countriesResult.data).length > 0) {
                        debugMessage += `\nDatos recibidos (no es un array o está vacío): ${JSON.stringify(countriesResult.data, null, 2)}`;
                    }
                }
                throw new Error(`Prueba de países fallida para la región '${firstRegion.name}'. ${debugMessage}`);
            }

            const firstCountry = countriesResult.data.countries[0];
            console.log(`Prueba de Países exitosa. Primer país encontrado: ${firstCountry.name}`);
            
        } catch (err: any) {
            testError = err;
        }

        // Restore original default state regardless of test outcome
        if (id !== originalDefaultId) {
            await client.query('UPDATE address_services SET is_default = FALSE');
            if (originalDefaultId) {
                await client.query('UPDATE address_services SET is_default = TRUE WHERE id = $1', [originalDefaultId]);
            }
        }
        await client.query('COMMIT');
        
        if(testError) {
             throw testError;
        }

        return { success: true, message: "¡Prueba exitosa! El flujo de obtención de datos de dirección funciona correctamente." };

    } catch (error: any) {
        if (client) {
            try { await client.query('ROLLBACK'); } catch (e) { /* ignore */ }
        }
        console.error("Error during address service test:", error);
        return { success: false, message: `Error durante la prueba: ${error.message}` };
    } finally {
        if (client) client.release();
    }
}
    

    






    



    

    

    




    