
'use server';

import type { PoolClient } from 'pg';
import { getDbPool } from './db';
import { supportedLanguages as initialLanguages } from './languages';
import * as fs from 'fs/promises';
import * as path from 'path';

// This flag prevents the migration from running more than once per server instance lifetime.
// It's a safeguard, but the core logic relies on the migrations_log table.
let migrationsRan = false;

export type DbInitResult = {
    success: boolean;
    message: string;
    log: string[];
};

// The order in which the SQL files should be executed.
const SCHEMA_FILES_ORDER = [
    'system/migrations_log.sql',
    'system/sessions.sql',
    'functions/update_timestamp.sql',
    'catalogs/base_schema.sql',
    'themes/base_schema.sql',
    'admins/base_schema.sql',
    'settings/base_schema.sql',
    'smtp/base_schema.sql',
    'condominiums/base_schema.sql',
    'residents/base_schema.sql',
    'gatekeepers/base_schema.sql',
    'devices/base_schema.sql',
    'maps/base_schema.sql',
    'translation/base_schema.sql'
];

async function applyAndLogSchema(client: PoolClient, filePath: string, log: string[]): Promise<void> {
    const fileName = path.basename(filePath);
    log.push(`CHECK: Checking schema file: ${fileName}`);
    const hasRunResult = await client.query('SELECT 1 FROM migrations_log WHERE file_name = $1', [fileName]);
    
    if (hasRunResult.rows.length > 0) {
        log.push(`SKIP: Schema file already applied: ${fileName}`);
        return;
    }

    try {
        log.push(`APPLY: Applying schema file: ${fileName}`);
        const sqlContent = await fs.readFile(path.join(process.cwd(), 'src/lib/sql', filePath), 'utf8');
        await client.query(sqlContent);
        await client.query('INSERT INTO migrations_log (file_name) VALUES ($1)', [fileName]);
        log.push(`SUCCESS: Successfully applied and logged: ${fileName}`);
    } catch (migrationError: any) {
        log.push(`ERROR: FAILED to apply schema file "${fileName}". Error: ${migrationError.message}`);
        throw migrationError;
    }
}


async function runDatabaseSetup(client: PoolClient, log: string[]): Promise<void> {
    const bcryptjs = (await import('bcryptjs')).default;

    // --- Phase 1: Apply all base table schemas from files ---
    log.push('PHASE: Applying all schemas from .sql files...');
    for (const filePath of SCHEMA_FILES_ORDER) {
        await applyAndLogSchema(client, filePath, log);
    }
    log.push('SUCCESS: All base schemas applied.');

    // --- Phase 2: Apply all non-destructive migrations ---
    log.push('PHASE: Applying non-destructive migrations (if any)...');
    // Add any future ALTER TABLE scripts here
    log.push('SUCCESS: Non-destructive migrations phase completed.');


    // --- Phase 3: Seed all initial data ---
    log.push('PHASE: Seeding all initial data...');

    // Seed Default Languages
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

    // Seed Default Admin User
    log.push('SEED: Checking for default admin user...');
    const adminEmail = 'admin@followforme.com';
    const correctPassword = 'admin';
    
    const adminResult = await client.query('SELECT id, password_hash FROM admins WHERE email = $1', [adminEmail]);
    if (adminResult.rows.length === 0) {
        log.push('SEED: Default admin not found. Seeding...');
        const dynamicallyGeneratedHash = await bcryptjs.hash(correctPassword, 10);
        await client.query(
            "INSERT INTO admins (name, email, password_hash, can_create_admins) VALUES ($1, $2, $3, TRUE) ON CONFLICT (email) DO NOTHING",
            ['Admin', adminEmail, dynamicallyGeneratedHash]
        );
        log.push('SUCCESS: Default admin user seeded.');
    } else {
        const admin = adminResult.rows[0];
        if (admin.password_hash) {
             const passwordMatch = await bcryptjs.compare(correctPassword, admin.password_hash);
            if (!passwordMatch) {
                log.push('SEED: Default admin found, but password does not match. Updating hash...');
                const newHash = await bcryptjs.hash(correctPassword, 10);
                await client.query('UPDATE admins SET password_hash = $1 WHERE id = $2', [newHash, admin.id]);
                log.push('SUCCESS: Default admin password hash updated.');
            } else {
                log.push('SKIP: Default admin user found and password is correct.');
            }
        } else {
            log.push('SEED: Default admin found, but password not set. Setting it...');
            const newHash = await bcryptjs.hash(correctPassword, 10);
            await client.query('UPDATE admins SET password_hash = $1 WHERE id = $2', [newHash, admin.id]);
            log.push('SUCCESS: Default admin password hash set.');
        }
    }

    // --- Phase 4: Seed Test Data ---
    log.push('PHASE: Seeding test data...');
    try {
        log.push('SEED: Checking for example condominium...');
        let condoRes = await client.query('SELECT id FROM condominiums WHERE name = $1', ['Condomínio Exemplo']);
        let condoId;

        if (condoRes.rows.length === 0) {
            log.push('SEED: Example condominium not found. Seeding...');
            condoRes = await client.query(
                `INSERT INTO condominiums (name, continent, country, state, city, street, number) 
                 VALUES ($1, 'Americas', 'Brazil', 'São Paulo', 'São Paulo', 'Avenida Paulista', '1000') 
                 ON CONFLICT (name) DO NOTHING RETURNING id`,
                ['Condomínio Exemplo']
            );
            condoId = condoRes.rows[0]?.id;
            if(condoId) log.push('SUCCESS: Example condominium seeded.');
            else {
                log.push('SKIP: Example condominium was likely created by a concurrent process.');
                condoRes = await client.query('SELECT id FROM condominiums WHERE name = $1', ['Condomínio Exemplo']);
                condoId = condoRes.rows[0].id;
            }
        } else {
            log.push('SKIP: Example condominium already exists.');
            condoId = condoRes.rows[0].id;
        }

        const testUsers = [
            { name: 'Alice Residente', email: 'alice@email.com', type: 'resident' },
            { name: 'Bob Residente', email: 'bob@email.com', type: 'resident' },
            { name: 'Carlos Porteiro', email: 'carlos@email.com', type: 'gatekeeper' }
        ];
        
        const userPasswordHash = await bcryptjs.hash('123456', 10);

        for (const user of testUsers) {
            const tableName = user.type === 'resident' ? 'residents' : 'gatekeepers';
            const userExists = await client.query(`SELECT 1 FROM ${tableName} WHERE email = $1`, [user.email]);
            if (userExists.rows.length === 0) {
                log.push(`SEED: Seeding test user: ${user.name}`);
                await client.query(
                    `INSERT INTO ${tableName} (condominium_id, name, email, password_hash, location, housing, phone)
                     VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (email) DO NOTHING`,
                    [condoId, user.name, user.email, userPasswordHash, 'Bloco A', 'Apto 101', '11999999999']
                );
            } else {
                log.push(`SKIP: Test user ${user.name} already exists.`);
            }
        }
        log.push('SUCCESS: Test users checked/seeded.');

    } catch (e: any) {
        log.push(`ERROR: Failed to seed test data. DB-Error: ${e.message}`);
        throw new Error(`Migration failed on phase: Seed Test Data. DB-Error: ${e.message}`);
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

        await dbClient.query('BEGIN');
        log.push('INFO: Transaction started.');
        
        await runDatabaseSetup(dbClient, log);
        
        await dbClient.query('COMMIT');
        log.push('SUCCESS: All schemas and data committed.');
        
        migrationsRan = true;
        log.push('END: Migration process completed successfully.');
        return { success: true, message: 'O processo de inicialização do banco de dados foi concluído.', log };

    } catch (error: any) {
        log.push(`CRITICAL: Database initialization failed. Error: ${error.message}`);
        console.error("CRITICAL: Database initialization failed.", error);
        
        if (dbClient) {
            try {
                await dbClient.query('ROLLBACK');
                log.push('INFO: Transaction rolled back due to error.');
            } catch (rbError: any) {
                log.push(`CRITICAL: Failed to rollback transaction. Error: ${rbError.message}`);
            }
        }
        
        return { success: false, message: `Erro de migração: ${error.message}`, log: log };
    } finally {
        if (dbClient) {
            dbClient.release();
        }
    }
}
