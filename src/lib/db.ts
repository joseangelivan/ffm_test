
'use server';

import type { Pool } from 'pg';

let pool: Pool | undefined;

async function createPool(): Promise<Pool> {
    const { Pool: PgPool } = await import('pg');
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:vxLaQxZOIeZNIIvCvjXEXYEhRAMmiUTT@mainline.proxy.rlwy.net:38539/railway';
    if (!connectionString) {
        throw new Error("DATABASE_URL environment variable is not set. Please provide a database connection string.");
    }
    return new PgPool({ connectionString });
}

export async function getDbPool(): Promise<Pool> {
    if (!pool) {
        console.log('[getDbPool] Pool not found. Initializing new pool...');
        pool = await createPool();
        try {
            await pool.query('SELECT NOW()');
            console.log('[getDbPool] Database pool initialized and connection verified.');
        } catch (error) {
            console.error("CRITICAL: Failed to connect with new pool.", error);
            pool = undefined;
            throw error;
        }
    }
    return pool;
}
