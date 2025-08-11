
'use server';

import type { Pool } from 'pg';
import { getDbPool } from './db';

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

        // Tables to drop in dependency order (users before admins, etc.)
        const tablesToDrop = [
            'admin_verification_pins', 'admin_totp_secrets', 'admin_first_login_pins', 'admin_settings',
            'sessions', 'admins', 'residents', 'gatekeepers', 
            'map_element_types', 'geofences', 'condominiums', 
            'device_types', 'communication_protocols',
            'translation_services',
            'app_settings', 'themes', 'smtp_configurations'
        ];
        console.log('[runMigrations] Cleaning up existing tables before migration...');
        for (const table of tablesToDrop) {
            try {
                await dbClient.query(`DROP TABLE IF EXISTS ${table} CASCADE;`);
                console.log(`[runMigrations] Dropped table (if exists): ${table}`);
            } catch (dropError: any) {
                console.warn(`[runMigrations] Could not drop table ${table}: ${dropError.message}`);
            }
        }

        const schemasToApply = [
            'admins/base_schema.sql',
            'condominiums/base_schema.sql',
            'residents/base_schema.sql',
            'gatekeepers/base_schema.sql',
            'sessions/base_schema.sql',
            'settings/base_schema.sql',
            'devices/base_schema.sql',
            'catalogs/base_schema.sql',
            'maps/base_schema.sql',
            'translation/base_schema.sql'
        ];

        // Clear previous migration logs for a clean run
        await dbClient.query('DELETE FROM migrations_log WHERE file_name = ANY($1::TEXT[])', [schemasToApply]);
        console.log('[runMigrations] Cleared previous migration logs for schemas to be applied.');
        
        for (const schemaFile of schemasToApply) {
            currentMigrationFile = schemaFile;
            
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


export async function initializeDatabase(): Promise<{success: boolean, message?: string}> {
    try {
        console.log('[initializeDatabase] Ensuring pool exists for initialization...');
        const pool = await getDbPool();
        await pool.query('SELECT NOW()');
        await runMigrations(pool);
        return { success: true };
    } catch (error: any) {
        console.error("CRITICAL: Database initialization failed.", error);
        return { success: false, message: error.message };
    }
}
