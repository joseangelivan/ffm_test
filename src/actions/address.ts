
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
  if (!path || path === '.' || path === '') return obj;

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

        const requestConfig = config.request?.api_config?.parameters;
        const responseConfig = config.response;
        
        if (!requestConfig || !responseConfig) {
            return { success: false, message: 'La configuración del servicio de dirección es inválida.' };
        }
        
        let data: AddressData = {};

        // --- REGIONS ---
        const regionsPath = responseConfig.regions?.path;
        if (requestConfig.regions?.value) { // Hardcoded regions
            data.regions = requestConfig.regions.value.map((r: string) => ({ name: r, code: r }));
        } else if (requestConfig.regions?.url && regionsPath) { // Fetched regions
            const response = await fetch(requestConfig.regions.url, { method: 'GET' });
            const regionsJson = await response.json();
            const regionList = getNestedValue(regionsJson, regionsPath);
            if (Array.isArray(regionList)) {
                data.regions = regionList.map((item: any) => ({
                    name: getNestedValue(item, responseConfig.regions.name),
                    code: getNestedValue(item, responseConfig.regions.code)
                })).filter(r => r.name);
                data.regionCodeMap = data.regions.reduce((acc, curr) => {
                    if (curr.name && curr.code) acc[curr.name] = curr.code;
                    return acc;
                }, {} as Record<string, string>);
            }
        }

        // --- COUNTRIES ---
        if ((params.region || params.region_code) && requestConfig.countries?.url) {
            let url = requestConfig.countries.url;
            if (url.includes('$region_code') && params.region_code) {
                 url = url.replace('$region_code', params.region_code);
            } else if (url.includes('$region')) {
                 url = url.replace('$region', params.region!);
            }
           
            const response = await fetch(url, { method: 'GET' });
            const countriesJson = await response.json();
            
            const countriesPath = responseConfig.countries?.path;
            const countryList = (countriesPath === '.' || countriesPath === '') ? countriesJson : getNestedValue(countriesJson, countriesPath);

            if (Array.isArray(countryList)) {
                data.countries = countryList.map((item: any) => ({
                    name: getNestedValue(item, responseConfig.countries.name),
                    cca2: getNestedValue(item, responseConfig.countries.cca2),
                    flag: getNestedValue(item, responseConfig.countries.flag),
                })).filter(c => c.name).sort((a: any, b: any) => a.name.localeCompare(b.name));
            }
        }

        // --- STATES ---
        if (params.country && requestConfig.states?.url) {
            const url = requestConfig.states.url.replace('$country', params.country);
            const body = JSON.stringify({ country: params.country });
            const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json'}, body });
            const statesJson = await response.json();

            const statesPath = responseConfig.states?.path;
            const stateList = (statesPath === '.' || statesPath === '') ? statesJson : getNestedValue(statesJson, statesPath);
            
            if (Array.isArray(stateList)) {
                data.states = stateList.map((item: any) => ({
                    name: getNestedValue(item, responseConfig.states.name)
                })).filter(s => s.name).sort((a: any, b: any) => a.name.localeCompare(b.name));
            }
        }

        // --- CITIES ---
        if (params.country && params.state && requestConfig.cities?.url) {
             const url = requestConfig.cities.url.replace('$state', params.state);
             const body = JSON.stringify({ country: params.country, state: params.state });
             const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json'}, body });
             const citiesJson = await response.json();
             
             const citiesPath = responseConfig.cities?.path;
             data.cities = ((citiesPath === '.' || citiesPath === '') ? citiesJson : getNestedValue(citiesJson, citiesPath)).sort();
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
    let service;
    try {
        const pool = await getDbPool();
        if (!pool) return { success: false, message: "Error del servidor." };
        client = await pool.connect();
        const serviceResult = await client.query('SELECT * FROM address_services WHERE id = $1', [id]);
        if (serviceResult.rows.length === 0) {
            return { success: false, message: "Servicio de dirección no encontrado." };
        }
        service = serviceResult.rows[0];
    } catch (error) {
        return { success: false, message: "Error de base de datos al buscar el servicio." };
    } finally {
        if (client) client.release();
    }

    try {
        // 1. Test Regions
        const regionsResult = await fetchAddressData({});
        if (!regionsResult.success || !regionsResult.data?.regions || regionsResult.data.regions.length === 0) {
            return { success: false, message: `Prueba de regiones fallida: ${regionsResult.message}` };
        }
        console.log("Regions test passed.");

        // 2. Test Countries
        const testRegion = regionsResult.data.regions[0];
        const countriesResult = await fetchAddressData({ region: testRegion.name, region_code: testRegion.code });
        if (!countriesResult.success || !countriesResult.data?.countries || countriesResult.data.countries.length === 0) {
            return { success: false, message: `Prueba de países fallida para la región '${testRegion.name}': ${countriesResult.message}` };
        }
        console.log("Countries test passed.");

        // 3. Test States
        const testCountry = countriesResult.data.countries[0];
        const statesResult = await fetchAddressData({ country: testCountry.name });
        if (!statesResult.success || !statesResult.data?.states || statesResult.data.states.length === 0) {
            // Some countries have no states, so this is not a fatal error, just a warning.
            console.log(`Prueba de estados advertencia para el país '${testCountry.name}': No se encontraron estados. Esto puede ser normal.`);
        } else {
            console.log("States test passed.");
            
            // 4. Test Cities (only if states were found)
            const testState = statesResult.data.states[0];
            const citiesResult = await fetchAddressData({ country: testCountry.name, state: testState.name });
            if (!citiesResult.success || !citiesResult.data?.cities || citiesResult.data.cities.length === 0) {
                 console.log(`Prueba de ciudades advertencia para '${testState.name}, ${testCountry.name}': No se encontraron ciudades. Esto puede ser normal.`);
            } else {
                console.log("Cities test passed.");
            }
        }

        return { success: true, message: "¡Prueba exitosa! El flujo de obtención de datos de dirección funciona correctamente." };

    } catch (error: any) {
        return { success: false, message: `Error durante la prueba: ${error.message}` };
    }
}

  