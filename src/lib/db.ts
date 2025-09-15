

'use server';

import type { Pool, PoolClient } from 'pg';

// Declare a global variable to hold the pool singleton.
// We use 'var' to ensure it's not block-scoped and can be accessed across requests in the same server process.
declare global {
  var _dbPool: Pool | undefined;
  interface Window {
    __googleMapsApiLoaded__: () => void;
  }
}

/**
 * Creates and returns a PostgreSQL connection pool using a singleton pattern.
 * This ensures that only one pool is created and shared across the application,
 * allowing it to manage connections efficiently and avoid timeout issues from
 * serverless environments.
 * @returns {Promise<Pool | null>} A promise that resolves to the pg Pool instance, or null if the connection fails.
 */
export async function getDbPool(): Promise<Pool | null> {
    const { Pool: PgPool } = await import('pg');

    if (global._dbPool) {
      // If the pool already exists, perform a quick test to ensure it's healthy
      // before returning it.
      try {
        const client = await global._dbPool.connect();
        await client.query('SELECT NOW()');
        client.release();
        return global._dbPool;
      } catch (error) {
        console.warn("Existing DB pool connection test failed. Will create a new one.", error);
        // If the existing pool is dead, discard it and proceed to create a new one.
        await global._dbPool.end();
        global._dbPool = undefined;
      }
    }
    
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:vxLaQxZOIeZNIIvCvjXEXYEhRAMmiUTT@mainline.proxy.rlwy.net:38539/railway';
    
    if (!connectionString) {
        console.error("DATABASE_URL environment variable is not set.");
        return null;
    }

    console.log("Creating new database connection pool.");
    const pool = new PgPool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err, client) => {
      console.error('Unexpected error on idle client', err);
    });

    // Test the new pool connection
    let client: PoolClient | null = null;
    try {
        client = await pool.connect();
        await client.query('SELECT NOW()'); 
        console.log("New database connection pool created and tested successfully.");
        // Store the new pool in the global variable.
        global._dbPool = pool;
        return pool;
    } catch (error) {
        console.error("Failed to create and test a new database connection pool.", error);
        await pool.end(); // Clean up the failed pool
        return null;
    } finally {
        if (client) {
            client.release();
        }
    }
}
