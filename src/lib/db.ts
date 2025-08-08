
'use server';

import type { Pool } from 'pg';

let pool: Pool | undefined;
let migrationsRan = false;

async function runMigrations(client: Pool): Promise<boolean> {
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;
    const bcrypt = (await import('bcrypt')).default;
    
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
            'settings/base_schema.sql',
            'devices/base_schema.sql',
            'catalogs/base_schema.sql',
            'maps/base_schema.sql'
        ];
        
        for (const schemaFile of schemasToApply) {
            currentMigrationFile = schemaFile;
            const checkMigration = await dbClient.query('SELECT 1 FROM migrations_log WHERE file_name = $1', [schemaFile]);
            
            if (checkMigration.rows.length > 0) {
                console.log(`[runMigrations] Migration already applied, skipping: ${schemaFile}`);
                continue; 
            }
            
            try {
                console.log(`[runMigrations] Applying migration: ${schemaFile}`);
                const sqlPath = path.join(process.cwd(), 'src', 'lib', 'sql', schemaFile);
                const schemaSql = await fs.readFile(sqlPath, 'utf-8');

                if (schemaSql.trim()) {
                    await dbClient.query(schemaSql);
                    await dbClient.query('INSERT INTO migrations_log (file_name) VALUES ($1)', [schemaFile]);
                    console.log(`[runMigrations] Successfully applied and logged: ${schemaFile}`);
                }
            } catch (migrationError: any) {
                console.error(`[runMigrations] FAILED to apply migration file "${schemaFile}". Error: ${migrationError.message}`);
                // Re-throw the error to be caught by the outer catch block, which will cause a ROLLBACK.
                throw migrationError;
            }
        }
        
        console.log('[runMigrations] Checking for default admin user...');
        const adminEmail = 'angelivan34@gmail.com';
        const correctPassword = 'adminivan123';
        const dynamicallyGeneratedHash = await bcrypt.hash(correctPassword, 10);

        const adminResult = await dbClient.query('SELECT id FROM admins WHERE email = $1', [adminEmail]);

        if (adminResult.rows.length === 0) {
            console.log('[runMigrations] Default admin not found. Seeding with dynamically generated hash...');
            await dbClient.query(
                "INSERT INTO admins (name, email, password_hash, can_create_admins) VALUES ($1, $2, $3, TRUE)",
                ['José Angel Iván Rubianes Silva', adminEmail, dynamicallyGeneratedHash]
            );
            console.log('[runMigrations] Default admin user seeded successfully.');
        } else {
            console.log('[runMigrations] Default admin user found. Forcing password hash update to ensure consistency...');
            await dbClient.query('UPDATE admins SET password_hash = $1, updated_at = NOW() WHERE email = $2', [dynamicallyGeneratedHash, adminEmail]);
            console.log('[runMigrations] Default admin password hash updated successfully.');
        }

        console.log('[runMigrations] Checking for test condominium...');
        const condoName = 'Condomínio de Teste';
        const condoExists = await dbClient.query('SELECT 1 FROM condominiums WHERE name = $1', [condoName]);
        if (condoExists.rows.length === 0) {
            console.log('[runMigrations] Test condominium not found. Seeding...');
            await dbClient.query(
                'INSERT INTO condominiums (name, continent, country, state, city, street, "number") VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (name) DO NOTHING',
                [condoName, 'Americas', 'Brazil', 'São Paulo', 'São Paulo', 'Avenida Paulista', '1000']
            );
            console.log('[runMigrations] Test condominium seeded successfully.');
        } else {
            console.log('[runMigrations] Test condominium already exists.');
        }

        await dbClient.query('COMMIT');
        migrationsRan = true;
        console.log('[runMigrations] Migration process completed successfully.');
        return true;
    } catch(error: any) {
         console.error(`[runMigrations] Error during migration of file "${currentMigrationFile}". Attempting ROLLBACK.`, error);
         await dbClient.query('ROLLBACK');
         throw new Error(`Migration failed on file: ${currentMigrationFile}. DB-Error: ${error.message}`);
    } finally {
        dbClient.release();
    }
}


async function createPool(): Promise<Pool> {
    const { Pool } = await import('pg');
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
            pool = await createPool();
        }
        await pool.query('SELECT NOW()');
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
