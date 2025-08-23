
'use server';

import type { Pool, PoolClient } from 'pg';

/**
 * Creates and returns a new PostgreSQL connection pool.
 * This function is designed to be called each time a database connection is needed,
 * which helps prevent issues with serverless database providers that may close idle
 * connections. It now includes a quick connection test.
 * @returns {Promise<Pool | null>} A promise that resolves to a new pg Pool instance, or null if the connection fails.
 */
export async function getDbPool(): Promise<Pool | null> {
    const { Pool: PgPool } = await import('pg');
    
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:vxLaQxZOIeZNIIvCvjXEXYEhRAMmiUTT@mainline.proxy.rlwy.net:38539/railway';
    
    if (!connectionString) {
        console.error("DATABASE_URL environment variable is not set.");
        return null;
    }

    const pool = new PgPool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000, // Reduced timeout for quicker feedback
    });

    pool.on('error', (err, client) => {
      console.error('Unexpected error on idle client', err);
    });

    // Test the connection before returning the pool
    let client: PoolClient | null = null;
    try {
        client = await pool.connect();
        await client.query('SELECT NOW()'); // A simple, fast query to ensure connectivity
    } catch (error) {
        console.error("Failed to connect to the database. This might be expected during initial setup or if the database is down.", error);
        // Do not throw an error, as the app should be able to start even if the DB is not ready.
        // The individual actions will handle the connection errors.
        return null;
    } finally {
        if (client) {
            client.release();
        }
    }

    return pool;
}
