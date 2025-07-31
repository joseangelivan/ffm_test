
'use server';

import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';

let pool: Pool | undefined;
let migrationsRan = false;

async function runMigrations(client: Pool) {
    if (migrationsRan) return;
    console.log('[runMigrations] Starting migration process...');
    const dbClient = await client.connect();
    try {
        await dbClient.query('BEGIN');
        
        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS migrations_log (
                id SERIAL PRIMARY KEY,
                file_name VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        
        const schemasToApply = [
            'settings/base_schema.sql',
            'admins/base_schema.sql',
            'condominiums/base_schema.sql',
            'residents/base_schema.sql',
            'gatekeepers/base_schema.sql',
        ];
        
        for (const schemaFile of schemasToApply) {
            const checkMigration = await dbClient.query('SELECT 1 FROM migrations_log WHERE file_name = $1', [schemaFile]);
            
            if (checkMigration.rows.length > 0) {
                console.log(`[runMigrations] Migration already applied, skipping: ${schemaFile}`);
                continue; 
            }
            console.log(`[runMigrations] Applying migration: ${schemaFile}`);
            
            const sqlPath = path.join(process.cwd(), 'src', 'lib', 'sql', schemaFile);
            let schemaSql = await fs.readFile(sqlPath, 'utf-8');

            if (schemaSql.trim()) {
                const createTypeRegex = /(CREATE TYPE "([^"]+)" AS ENUM \([^)]+\);)/gi;
                let match;
                while ((match = createTypeRegex.exec(schemaSql)) !== null) {
                    const fullMatch = match[1];
                    const typeName = match[2];
                    const safeBlock = `
                        DO $$
                        BEGIN
                            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${typeName}') THEN
                                ${fullMatch}
                            END IF;
                        END$$;
                    `;
                    schemaSql = schemaSql.replace(fullMatch, safeBlock);
                }
                
                await dbClient.query(schemaSql);
                await dbClient.query('INSERT INTO migrations_log (file_name) VALUES ($1)', [schemaFile]);
            }
        }

        await dbClient.query('COMMIT');
        migrationsRan = true;
        console.log('[runMigrations] Migration process completed successfully.');
    } catch(error) {
         console.error('[runMigrations] Error during migration transaction. Attempting ROLLBACK.', error);
         await dbClient.query('ROLLBACK');
         throw error;
    } finally {
        dbClient.release();
    }
}

export async function getDbPool(forceMigration = false): Promise<Pool> {
    if (!pool) {
        try {
            console.log('[getDbPool] Initializing database pool...');
            pool = new Pool({
                connectionString: process.env.DATABASE_URL || 'postgresql://postgres:vxLaQxZOIeZNIIvCvjXEXYEhRAMmiUTT@mainline.proxy.rlwy.net:38539/railway',
            });
            await pool.query('SELECT NOW()'); // Test connection
            console.log('[getDbPool] Database pool initialized successfully.');
        } catch (error) {
            console.error("CRITICAL: Failed during database pool initialization.", error);
            pool = undefined; // Ensure pool is not left in a bad state
            throw new Error("Database initialization failed.");
        }
    }
    
    // Only run migrations if explicitly forced
    if (forceMigration) {
        await runMigrations(pool);
    }
    
    return pool;
}
