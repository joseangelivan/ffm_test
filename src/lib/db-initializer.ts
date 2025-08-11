
'use server';

import type { PoolClient } from 'pg';
import { getDbPool } from './db';

// This flag prevents the migration from running more than once per server instance lifetime.
// It's a safeguard, but the core logic relies on the migrations_log table.
let migrationsRan = false;

export type DbInitResult = {
    success: boolean;
    message: string;
    log: string[];
};


async function runMigrations(client: PoolClient): Promise<DbInitResult> {
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;
    const bcrypt = (await import('bcryptjs')).default;
    
    const log: string[] = [];
    
    if (migrationsRan) {
        log.push('INFO: Migrations already ran in this instance. Skipping.');
        return { success: true, message: 'Migrations already ran.', log };
    }
    
    log.push('START: Starting migration process...');
    let currentMigrationFile = 'N/A';
    try {
        await client.query('BEGIN');
        
        log.push('SETUP: Ensuring migrations_log table exists...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS migrations_log (
                id SERIAL PRIMARY KEY,
                file_name VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        log.push('SUCCESS: migrations_log table is ready.');

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
            log.push(`CHECK: Checking migration: ${schemaFile}`);
            
            const hasRunResult = await client.query('SELECT 1 FROM migrations_log WHERE file_name = $1', [schemaFile]);
            if (hasRunResult.rows.length > 0) {
                log.push(`SKIP: Migration already applied: ${schemaFile}`);
                continue;
            }

            try {
                log.push(`APPLY: Applying migration: ${schemaFile}`);
                const sqlPath = path.join(process.cwd(), 'src', 'lib', 'sql', schemaFile);
                const schemaSql = await fs.readFile(sqlPath, 'utf-8');

                if (schemaSql.trim()) {
                    await client.query(schemaSql);
                    await client.query('INSERT INTO migrations_log (file_name) VALUES ($1)', [schemaFile]);
                    log.push(`SUCCESS: Successfully applied and logged: ${schemaFile}`);
                } else {
                     log.push(`SKIP: Skipping empty migration file: ${schemaFile}`);
                }
            } catch (migrationError: any) {
                log.push(`ERROR: FAILED to apply migration file "${schemaFile}". Error: ${migrationError.message}`);
                throw migrationError;
            }
        }
        
        log.push('SEED: Checking for default admin user...');
        const adminEmail = 'angelivan34@gmail.com';
        const correctPassword = 'adminivan123';
        const dynamicallyGeneratedHash = await bcrypt.hash(correctPassword, 10);

        const adminResult = await client.query('SELECT id, password_hash FROM admins WHERE email = $1', [adminEmail]);

        if (adminResult.rows.length === 0) {
            log.push('SEED: Default admin not found. Seeding with dynamically generated hash...');
            await client.query(
                "INSERT INTO admins (name, email, password_hash, can_create_admins) VALUES ($1, $2, $3, TRUE) ON CONFLICT (email) DO NOTHING",
                ['José Angel Iván Rubianes Silva', adminEmail, dynamicallyGeneratedHash]
            );
            log.push('SUCCESS: Default admin user seeded.');
        } else {
            const admin = adminResult.rows[0];
            const passwordMatch = await bcrypt.compare(correctPassword, admin.password_hash);
            if (!passwordMatch) {
                log.push('SEED: Default admin found, but password does not match. Updating hash...');
                await client.query('UPDATE admins SET password_hash = $1 WHERE id = $2', [dynamicallyGeneratedHash, admin.id]);
                log.push('SUCCESS: Default admin password hash updated.');
            } else {
                log.push('SKIP: Default admin user found and password is correct.');
            }
        }

        log.push('SEED: Checking for test condominium...');
        const condoName = 'Condomínio de Teste';
        const condoExists = await client.query('SELECT 1 FROM condominiums WHERE name = $1', [condoName]);
        if (condoExists.rows.length === 0) {
            log.push('SEED: Test condominium not found. Seeding...');
            await client.query(
                'INSERT INTO condominiums (name, continent, country, state, city, street, "number") VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (name) DO NOTHING',
                [condoName, 'Americas', 'Brazil', 'São Paulo', 'São Paulo', 'Avenida Paulista', '1000']
            );
            log.push('SUCCESS: Test condominium seeded.');
        } else {
            log.push('SKIP: Test condominium already exists.');
        }

        await client.query('COMMIT');
        migrationsRan = true;
        log.push('END: Migration process completed successfully.');
        return { success: true, message: 'O processo de inicialização do banco de dados foi concluído.', log };
    } catch(error: any) {
         log.push(`FATAL: Error during migration of file "${currentMigrationFile}". Attempting ROLLBACK.`);
         await client.query('ROLLBACK');
         throw new Error(`Migration failed on file: ${currentMigrationFile}. DB-Error: ${error.message}`);
    }
}


export async function initializeDatabase(): Promise<DbInitResult> {
    let dbClient;
    const initialLog: string[] = [];
    try {
        initialLog.push('INFO: Ensuring pool exists for initialization...');
        const pool = await getDbPool();
        dbClient = await pool.connect();
        initialLog.push('SUCCESS: DB Pool connected.');
        return await runMigrations(dbClient);
    } catch (error: any) {
        initialLog.push(`CRITICAL: Database initialization failed. Error: ${error.message}`);
        console.error("CRITICAL: Database initialization failed.", error);
        return { success: false, message: error.message, log: initialLog };
    } finally {
        if (dbClient) {
            dbClient.release();
        }
    }
}
