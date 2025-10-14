
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
};

export type AddressData = {
    regions?: string[];
    countries?: AddressDataItem[];
    states?: AddressDataItem[];
    cities?: string[];
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
  // If path is "." or empty, return the object itself, as it's the root.
  if (path === '.' || path === '') return obj;

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

        // Regions
        const regionsPath = responseConfig.regions?.path;
        if (regionsPath) {
            data.regions = getNestedValue(config, regionsPath) || [];
        }

        // Countries
        if (params.region && requestConfig.countries?.url) {
            const url = requestConfig.countries.url.replace('$region', params.region);
            const response = await fetch(url, { method: 'GET' });
            const countriesJson = await response.json();
            
            const countriesPath = responseConfig.countries?.path;
            const countryList = (countriesPath === '.' || countriesPath === '') ? countriesJson : getNestedValue(countriesJson, countriesPath);

            if (Array.isArray(countryList)) {
                data.countries = countryList.map((item: any) => ({
                    name: getNestedValue(item, responseConfig.countries.name),
                    cca2: getNestedValue(item, responseConfig.countries.cca2),
                    flag: getNestedValue(item, responseConfig.countries.flag),
                })).sort((a: any, b: any) => a.name.localeCompare(b.name));
            }
        }

        // States
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
                })).sort((a: any, b: any) => a.name.localeCompare(b.name));
            }
        }

        // Cities
        if (params.country && params.state && requestConfig.cities?.url) {
             const url = requestConfig.cities.url.replace('$country', params.country).replace('$state', params.state);
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

    const config = service.config_json;
    const requestConfig = config.request?.api_config?.parameters;
    const responseConfig = config.response;

    if (!requestConfig || !responseConfig) {
        return { success: false, message: 'La configuración del servicio de dirección es inválida.' };
    }

    try {
        // 1. Test Regions
        const regionsPath = responseConfig.regions?.path;
        const regions = regionsPath ? getNestedValue(config, regionsPath) : [];
        if (!Array.isArray(regions) || regions.length === 0) {
            return { success: false, message: "Prueba de regiones fallida: No se encontró una lista de regiones." };
        }

        // 2. Test Countries
        const testRegion = "Americas";
        if (requestConfig.countries?.url) {
            const url = requestConfig.countries.url.replace('$region', testRegion);
            const response = await fetch(url, { method: 'GET' });
            const countriesJson = await response.json();
            const countriesPath = responseConfig.countries?.path;
            const countryList = (countriesPath === '.' || countriesPath === '') ? countriesJson : getNestedValue(countriesJson, countriesPath);
            if (!Array.isArray(countryList) || countryList.length === 0) {
                return { success: false, message: `Prueba de países fallida para la región '${testRegion}'.` };
            }
        }

        // 3. Test States
        const testCountry = "Brazil";
        if (requestConfig.states?.url) {
            const url = requestConfig.states.url.replace('$country', testCountry);
            const body = JSON.stringify({ country: testCountry });
            const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json'}, body });
            const statesJson = await response.json();
            const statesPath = responseConfig.states?.path;
            const stateList = (statesPath === '.' || statesPath === '') ? statesJson : getNestedValue(statesJson, statesPath);
            if (!Array.isArray(stateList) || stateList.length === 0) {
                return { success: false, message: `Prueba de estados fallida para el país '${testCountry}'.` };
            }
        }

        // 4. Test Cities
        const testState = "São Paulo";
        if (requestConfig.cities?.url) {
            const url = requestConfig.cities.url.replace('$country', testCountry).replace('$state', testState);
            const body = JSON.stringify({ country: testCountry, state: testState });
            const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json'}, body });
            const citiesJson = await response.json();
            const citiesPath = responseConfig.cities?.path;
            const cityList = (citiesPath === '.' || citiesPath === '') ? citiesJson : getNestedValue(citiesJson, citiesPath);
            if (!Array.isArray(cityList) || cityList.length === 0) {
                return { success: false, message: `Prueba de ciudades fallida para '${testState}, ${testCountry}'.` };
            }
        }

        return { success: true, message: "¡Prueba exitosa! Se obtuvieron correctamente los datos de regiones, países, estados y ciudades." };

    } catch (error: any) {
        return { success: false, message: `Error durante la prueba: ${error.message}` };
    }
}
