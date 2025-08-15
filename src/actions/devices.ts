
'use server';

import { getDbPool } from '@/lib/db';

export type Device = {
  id: string;
  condominium_id: string;
  device_type_id: string;
  name: string;
  token: string;
  created_at: string;
  updated_at: string;
  device_type_name: string;
};

export async function getDevicesByCondoId(condoId: string): Promise<Device[] | null> {
    if (!condoId) return null;

    let client;
    try {
        const pool = await getDbPool();
        client = await pool.connect();
        const query = `
            SELECT 
                d.id,
                d.condominium_id,
                d.device_type_id,
                d.name,
                d.token,
                d.created_at,
                d.updated_at,
                dt.name_translations->>'pt-BR' as device_type_name 
            FROM devices d
            JOIN device_types dt ON d.device_type_id = dt.id
            WHERE d.condominium_id = $1
            ORDER BY d.name ASC;
        `;
        const result = await client.query(query, [condoId]);
        return result.rows;
    } catch (error) {
        console.error(`Error getting devices for condo ${condoId}:`, error);
        return null;
    } finally {
        if (client) client.release();
    }
}
