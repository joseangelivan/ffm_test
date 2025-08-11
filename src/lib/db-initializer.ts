
'use server';

import type { PoolClient } from 'pg';
import { getDbPool } from './db';

// This flag prevents the migration from running more than once per server instance lifetime.
// It's a safeguard, but the core logic relies on the migrations_log table.
let migrationsRan = false;

async function runMigrations(client: PoolClient): Promise<boolean> {
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;
    const bcrypt = (await import('bcryptjs')).default;
    
    if (migrationsRan) {
        console.log('[runMigrations] Migrations already ran in this instance. Skipping.');
        return false;
    }
    
    console.log('[runMigrations] Starting migration process...');
    let currentMigrationFile = 'N/A';
    try {
        await client.query('BEGIN');
        
        console.log('[runMigrations] Ensuring migrations_log table exists...');
        await client.query(`
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
            'maps/base_schema.sql',
            'translation/base_schema.sql'
        ];
        
        for (const schemaFile of schemasToApply) {
            currentMigrationFile = schemaFile;
            
            const hasRunResult = await client.query('SELECT 1 FROM migrations_log WHERE file_name = $1', [schemaFile]);
            if (hasRunResult.rows.length > 0) {
                console.log(`[runMigrations] Skipping already applied migration: ${schemaFile}`);
                continue;
            }

            try {
                console.log(`[runMigrations] Applying migration: ${schemaFile}`);
                const sqlPath = path.join(process.cwd(), 'src', 'lib', 'sql', schemaFile);
                const schemaSql = await fs.readFile(sqlPath, 'utf-8');

                if (schemaSql.trim()) {
                    await client.query(schemaSql);
                    await client.query('INSERT INTO migrations_log (file_name) VALUES ($1)', [schemaFile]);
                    console.log(`[runMigrations] Successfully applied and logged: ${schemaFile}`);
                } else {
                     console.log(`[runMigrations] Skipping empty migration file: ${schemaFile}`);
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

        const adminResult = await client.query('SELECT id, password_hash FROM admins WHERE email = $1', [adminEmail]);

        if (adminResult.rows.length === 0) {
            console.log('[runMigrations] Default admin not found. Seeding with dynamically generated hash...');
            await client.query(
                "INSERT INTO admins (name, email, password_hash, can_create_admins) VALUES ($1, $2, $3, TRUE) ON CONFLICT (email) DO NOTHING",
                ['José Angel Iván Rubianes Silva', adminEmail, dynamicallyGeneratedHash]
            );
            console.log('[runMigrations] Default admin user seeded successfully.');
        } else {
             // Optional: Update password if it doesn't match, for development convenience
            const admin = adminResult.rows[0];
            const passwordMatch = await bcrypt.compare(correctPassword, admin.password_hash);
            if (!passwordMatch) {
                console.log('[runMigrations] Default admin found, but password does not match. Updating hash...');
                await client.query('UPDATE admins SET password_hash = $1 WHERE id = $2', [dynamicallyGeneratedHash, admin.id]);
                console.log('[runMigrations] Default admin password hash updated.');
            } else {
                console.log('[runMigrations] Default admin user found and password is correct. Skipping seeding.');
            }
        }

        console.log('[runMigrations] Checking for test condominium...');
        const condoName = 'Condomínio de Teste';
        const condoExists = await client.query('SELECT 1 FROM condominiums WHERE name = $1', [condoName]);
        if (condoExists.rows.length === 0) {
            console.log('[runMigrations] Test condominium not found. Seeding...');
            await client.query(
                'INSERT INTO condominiums (name, continent, country, state, city, street, "number") VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (name) DO NOTHING',
                [condoName, 'Americas', 'Brazil', 'São Paulo', 'São Paulo', 'Avenida Paulista', '1000']
            );
            console.log('[runMigrations] Test condominium seeded successfully.');
        } else {
            console.log('[runMigrations] Test condominium already exists.');
        }

        await client.query('COMMIT');
        migrationsRan = true;
        console.log('[runMigrations] Migration process completed successfully.');
        return true;
    } catch(error: any) {
         console.error(`[runMigrations] Error during migration of file "${currentMigrationFile}". Attempting ROLLBACK.`, error);
         await client.query('ROLLBACK');
         throw new Error(`Migration failed on file: ${currentMigrationFile}. DB-Error: ${error.message}`);
    }
}


export async function initializeDatabase(): Promise<{success: boolean, message?: string}> {
    let dbClient;
    try {
        console.log('[initializeDatabase] Ensuring pool exists for initialization...');
        const pool = await getDbPool();
        dbClient = await pool.connect();
        await runMigrations(dbClient);
        return { success: true, message: 'O processo de inicialização do banco de dados foi concluído.' };
    } catch (error: any) {
        console.error("CRITICAL: Database initialization failed.", error);
        return { success: false, message: error.message };
    } finally {
        if (dbClient) {
            dbClient.release();
        }
    }
}
