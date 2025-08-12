
'use server';

import type { PoolClient } from 'pg';
import { getDbPool } from './db';
import { supportedLanguages as initialLanguages } from './languages';

// This flag prevents the migration from running more than once per server instance lifetime.
// It's a safeguard, but the core logic relies on the migrations_log table.
let migrationsRan = false;

export type DbInitResult = {
    success: boolean;
    message: string;
    log: string[];
};

async function applySchemas(client: PoolClient, log: string[]): Promise<void> {
    const fs = (await import('fs/promises')).default;
    const path = (await import('path')).default;

    log.push('PHASE: Applying all schemas...');
    
    // Corrected order: catalogs must be created early on.
    const schemasToApply = [
        'admins/base_schema.sql',
        'themes/base_schema.sql',
        'settings/base_schema.sql',
        'catalogs/base_schema.sql', // Creates 'languages' table
        'condominiums/base_schema.sql',
        'residents/base_schema.sql',
        'gatekeepers/base_schema.sql',
        'sessions/base_schema.sql',
        'devices/base_schema.sql',
        'maps/base_schema.sql',
        'translation/base_schema.sql'
    ];
    
    for (const schemaFile of schemasToApply) {
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
    
    log.push('SUCCESS: All schemas applied.');
}

async function seedData(client: PoolClient, log: string[]): Promise<void> {
    const bcrypt = (await import('bcryptjs')).default;
    
    log.push('PHASE: Seeding initial data...');

    // --- Seed Default Languages ---
    try {
        log.push('SEED: Checking for default languages...');
        const langCountResult = await client.query('SELECT COUNT(*) FROM languages');
        if (parseInt(langCountResult.rows[0].count, 10) === 0) {
            log.push('SEED: Languages table is empty. Seeding initial languages...');
            const langEntries = Object.entries(initialLanguages);
            for (const [code, names] of langEntries) {
                const translations = { es: names.es, 'pt-BR': names['pt-BR'] };
                await client.query(
                    'INSERT INTO languages (id, name_translations) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
                    [code, translations]
                );
            }
            log.push(`SUCCESS: Seeded ${langEntries.length} languages.`);
        } else {
            log.push('SKIP: Languages table already contains data.');
        }
    } catch (e: any) {
         log.push(`ERROR: Failed to seed languages. DB-Error: ${e.message}`);
        throw new Error(`Migration failed on phase: Seed Languages. DB-Error: ${e.message}`);
    }


    // --- Seed Default Admin User ---
    log.push('SEED: Checking for default admin user...');
    const adminEmail = 'angelivan34@gmail.com';
    const correctPassword = 'adminivan123';
    const dynamicallyGeneratedHash = await bcrypt.hash(correctPassword, 10);

    const adminResult = await client.query('SELECT id, password_hash FROM admins WHERE email = $1', [adminEmail]);
    if (adminResult.rows.length === 0) {
        log.push('SEED: Default admin not found. Seeding...');
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
    
    // --- Seed Test Condominium ---
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

    log.push('SUCCESS: Data seeding phase completed.');
}

export async function initializeDatabase(): Promise<DbInitResult> {
    if (migrationsRan) {
        return { success: true, message: 'Migrations already ran.', log: ['INFO: Migrations already ran in this instance. Skipping.'] };
    }
    
    let dbClient;
    const log: string[] = [];
    
    try {
        log.push('INFO: Ensuring pool exists for initialization...');
        const pool = await getDbPool();
        dbClient = await pool.connect();
        log.push('SUCCESS: DB Pool connected.');

        // Start transaction
        await dbClient.query('BEGIN');

        log.push('SETUP: Ensuring migrations_log table exists...');
        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS migrations_log (
                id SERIAL PRIMARY KEY,
                file_name VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        log.push('SUCCESS: migrations_log table is ready.');

        // Phase 1: Create all schemas
        await applySchemas(dbClient, log);

        // Phase 2: Seed initial data
        await seedData(dbClient, log);

        // Commit transaction
        await dbClient.query('COMMIT');
        
        migrationsRan = true;
        log.push('END: Migration process completed successfully.');
        return { success: true, message: 'O processo de inicialização do banco de dados foi concluído.', log };
    } catch (error: any) {
        log.push(`CRITICAL: Database initialization failed. Error: ${error.message}`);
        console.error("CRITICAL: Database initialization failed.", error);
        
        if (dbClient) {
            try {
                await dbClient.query('ROLLBACK');
                log.push('INFO: Transaction rolled back.');
            } catch (rbError) {
                log.push(`CRITICAL: Failed to rollback transaction. Error: ${rbError}`);
            }
        }
        
        return { success: false, message: error.message, log: log };
    } finally {
        if (dbClient) {
            dbClient.release();
        }
    }
}
