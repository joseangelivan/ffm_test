
'use server';

import type { Pool } from 'pg';

/**
 * Creates and returns a new PostgreSQL connection pool.
 * This function is designed to be called each time a database connection is needed,
 * which helps prevent issues with serverless database providers that may close idle
 * connections.
 * @returns {Promise<Pool>} A promise that resolves to a new pg Pool instance.
 */
export async function getDbPool(): Promise<Pool> {
    const { Pool: PgPool } = await import('pg');
    
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:vxLaQxZOIeZNIIvCvjXEXYEhRAMmiUTT@mainline.proxy.rlwy.net:38539/railway';
    
    if (!connectionString) {
        console.error("DATABASE_URL environment variable is not set.");
        throw new Error("DATABASE_URL environment variable is not set. Please provide a database connection string.");
    }

    const pool = new PgPool({
      connectionString,
      // Recommended settings for serverless/ephemeral environments
      max: 10, // Max number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 20000, // Return an error after 20 seconds if connection could not be established
    });

    // Add a listener for connection errors on the pool
    pool.on('error', (err, client) => {
      console.error('Unexpected error on idle client', err);
    });

    return pool;
}
