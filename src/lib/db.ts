
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
    }
    try {
        // Test the connection before returning the pool
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
    } catch (error) {
        console.error("[getDbPool] Existing pool connection test failed. Re-initializing pool...", error);
        pool = await createPool();
        try {
            // Test the new pool connection
            const client = await pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            console.log("[getDbPool] New pool initialized and connection verified.");
        } catch (newPoolError) {
             console.error("CRITICAL: Failed to connect with new pool.", newPoolError);
            // Set pool to undefined so the next call will try to re-initialize
            pool = undefined; 
            throw newPoolError;
        }
    }
    return pool;
}
