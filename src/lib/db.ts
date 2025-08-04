
'use server';

import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcrypt';

let pool: Pool | undefined;
let migrationsRan = false;

async function runMigrations(client: Pool): Promise<boolean> {
    if (migrationsRan) {
        console.log('[runMigrations] Migrations already ran in this instance. Skipping.');
        return false;
    }
    
    console.log('[runMigrations] Starting migration process...');
    const dbClient = await client.connect();
    let currentMigrationFile = 'N/A';
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
            'admins/base_schema.sql',
            'condominiums/base_schema.sql',
            'residents/base_schema.sql',
            'gatekeepers/base_schema.sql',
            'sessions/base_schema.sql',
            'settings/base_schema.sql'
        ];
        
        for (const schemaFile of schemasToApply) {
            currentMigrationFile = schemaFile;
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

        // Seed default admin after all tables are created
        console.log('[runMigrations] Seeding default admin user...');
        const adminEmail = 'angelivan34@gmail.com';
        const adminExists = await dbClient.query('SELECT 1 FROM admins WHERE email = $1', [adminEmail]);
        if (adminExists.rows.length === 0) {
            const password = 'adminivan123';
            const hashedPassword = await bcrypt.hash(password, 10);
            await dbClient.query(
                "INSERT INTO admins (name, email, password_hash, can_create_admins) VALUES ($1, $2, $3, TRUE)",
                ['José Angel Iván Rubianes Silva', adminEmail, hashedPassword]
            );
            console.log('[runMigrations] Default admin user seeded successfully.');
        } else {
            console.log('[runMigrations] Default admin user already exists.');
        }

        await dbClient.query('COMMIT');
        migrationsRan = true;
        console.log('[runMigrations] Migration process completed successfully.');
        return true;
    } catch(error: any) {
         console.error(`[runMigrations] Error during migration of file "${currentMigrationFile}". Attempting ROLLBACK.`, error);
         await dbClient.query('ROLLBACK');
         // Re-throw the error with additional context
         throw new Error(`Migration failed on file: ${currentMigrationFile}. DB-Error: ${error.message}`);
    } finally {
        dbClient.release();
    }
}


function createPool(): Pool {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:vxLaQxZOIeZNIIvCvjXEXYEhRAMmiUTT@mainline.proxy.rlwy.net:38539/railway';
    if (!connectionString) {
        throw new Error("DATABASE_URL environment variable is not set. Please provide a database connection string.");
    }
    return new Pool({ connectionString });
}

export async function initializeDatabase(): Promise<{success: boolean, message?: string}> {
    try {
        console.log('[initializeDatabase] Ensuring pool exists for initialization...');
        if (!pool) {
            pool = createPool();
        }
        await pool.query('SELECT NOW()'); // Test connection
        await runMigrations(pool);
        return { success: true };
    } catch (error: any) {
        console.error("CRITICAL: Database initialization failed.", error);
        pool = undefined;
        migrationsRan = false;
        return { success: false, message: error.message };
    }
}

export async function getDbPool(): Promise<Pool> {
    if (!pool) {
        console.log('[getDbPool] Pool not found. Initializing new pool...');
        pool = createPool();
        try {
            await pool.query('SELECT NOW()');
            console.log('[getDbPool] Database pool initialized and connection verified.');
        } catch (error) {
            console.error("CRITICAL: Failed to connect with new pool.", error);
            pool = undefined;
            throw error; // Re-throw the error to be caught by the caller
        }
    }
    return pool;
}
