
'use server';

import type { PoolClient } from 'pg';
import { getDbPool } from './db';
import * as fs from 'fs/promises';
import * as path from 'path';
import bcryptjs from 'bcryptjs';

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

    // --- Phase 1: Apply all base table schemas from files ---
    log.push('PHASE: Applying all schemas from .sql files...');
    for (const filePath of SCHEMA_FILES_ORDER) {
        await applyAndLogSchema(client, filePath, log);
    }
    log.push('SUCCESS: All base schemas applied.');

    // --- Phase 2: Seed initial required data (as a backup) ---
    log.push('PHASE: Seeding all initial data...');
    try {
        const adminEmail = 'angelivan34@gmail.com';
        const correctPassword = 'adminivan123';
        const dynamicallyGeneratedHash = await bcryptjs.hash(correctPassword, 10);
        
        await client.query(
            "INSERT INTO admins (name, email, password_hash, can_create_admins) VALUES ($1, $2, $3, TRUE) ON CONFLICT (email) DO NOTHING",
            ['José Angel Iván Rubianes Silva', adminEmail, dynamicallyGeneratedHash]
        );
        log.push('SUCCESS: Default admin user seeded.');
    } catch (e: any) {
        log.push(`ERROR: Could not seed default admin. Error: ${e.message}`);
        throw e;
    }

    try {
        await client.query(
            "INSERT INTO device_types (name_translations) VALUES ('{ \"es\": \"Teléfono Inteligente\", \"pt-BR\": \"Smartphone\" }') ON CONFLICT (id) DO NOTHING"
        );
        log.push('SUCCESS: Default device type seeded.');

        await client.query(
            "INSERT INTO languages (id, name_translations) VALUES ('es', '{ \"es\": \"Español\", \"pt-BR\": \"Espanhol\" }') ON CONFLICT (id) DO NOTHING"
        );
        await client.query(
            "INSERT INTO languages (id, name_translations) VALUES ('pt-BR', '{ \"es\": \"Portugués (Brasil)\", \"pt-BR\": \"Português (Brasil)\" }') ON CONFLICT (id) DO NOTHING"
        );
        log.push('SUCCESS: Default UI languages seeded.');

    } catch (e: any) {
        log.push(`ERROR: Could not seed catalogs. Error: ${e.message}`);
        throw e;
    }
    log.push('SUCCESS: Initial data seeding completed.');


    // --- Phase 3: Seed Test Data (as a backup) ---
    log.push('PHASE: Seeding test data...');
    let testCondoId = '';
    try {
        const res = await client.query(
            "INSERT INTO condominiums (name, address, continent, country, state, city, street, number) VALUES ('Condominio Paraíso', 'Av. del Edén 123, Jardines, Ciudad Capital, Capital', 'Americas', 'Brazil', 'Sao Paulo', 'Sao Paulo', 'Av. del Edén', '123') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id"
        );
        if (res.rows.length > 0) {
            testCondoId = res.rows[0].id;
            log.push('SUCCESS: Test condominium seeded.');
        } else {
            const existing = await client.query("SELECT id FROM condominiums WHERE name = 'Condominio Paraíso'");
            if (existing.rows.length > 0) {
                testCondoId = existing.rows[0].id;
                log.push('SKIP: Test condominium already exists.');
            } else {
                 log.push('WARN: Test condominium does not exist and could not be created.');
            }
        }
    } catch (e: any) {
        log.push(`ERROR: Could not seed test condominium. Error: ${e.message}`);
        throw e;
    }

    if (testCondoId) {
        try {
            const residentPassword = await bcryptjs.hash('password123', 10);
            const gatekeeperPassword = await bcryptjs.hash('portero123', 10);

            await client.query(
                "INSERT INTO residents (condominium_id, name, email, password_hash, location, housing, phone) VALUES ($1, 'Juan Pérez', 'juan.perez@email.com', $2, 'Torre A', 'Apto 101', '+5511987654321') ON CONFLICT (email) DO NOTHING",
                [testCondoId, residentPassword]
            );
             await client.query(
                "INSERT INTO gatekeepers (condominium_id, name, email, password_hash, location, housing, phone) VALUES ($1, 'Pedro arias', 'pedro.arias@email.com', $2, 'portaria 1', 'portaria 1', '+5511987654321') ON CONFLICT (email) DO NOTHING",
                [testCondoId, gatekeeperPassword]
            );
            log.push('SUCCESS: Test users (resident and gatekeeper) seeded.');
        } catch (e: any) {
            log.push(`ERROR: Could not seed test users. Error: ${e.message}`);
            throw e;
        }
    } else {
        log.push('WARN: Skipping test user seeding because test condominium could not be created or found.');
    }
    log.push('SUCCESS: Test data seeding completed.');
}


export async function initializeDatabase(
    prevState: DbInitResult | undefined,
    formData: FormData
): Promise<DbInitResult> {
    if (migrationsRan) {
        return { success: true, message: 'As migrações já foram executadas.', log: ['INFO: As migrações já foram executadas nesta instância. Ignorando.'] };
    }
    
    let dbClient;
    const log: string[] = [];
    
    try {
        log.push('INFO: Garantindo que o pool exista para a inicialização...');
        const pool = await getDbPool();
        dbClient = await pool.connect();
        log.push('SUCCESS: Pool do BD conectado.');

        await dbClient.query('BEGIN');
        log.push('INFO: Transação iniciada.');
        
        await runDatabaseSetup(dbClient, log);
        
        await dbClient.query('COMMIT');
        log.push('SUCCESS: Todos os esquemas e dados foram commitados.');
        
        migrationsRan = true;
        log.push('END: Processo de migração concluído com sucesso.');
        return { success: true, message: 'O processo de inicialização do banco de dados foi concluído.', log };

    } catch (error: any) {
        log.push(`CRITICAL: A inicialização do banco de dados falhou. Erro: ${error.message}`);
        console.error("CRITICAL: A inicialização do banco de dados falhou.", error);
        
        if (dbClient) {
            try {
                await dbClient.query('ROLLBACK');
                log.push('INFO: Transação revertida devido a erro.');
            } catch (rbError: any) {
                log.push(`CRITICAL: Falha ao reverter a transação. Erro: ${rbError.message}`);
            }
        }
        
        return { success: false, message: `Erro de migração: ${error.message}`, log: log };
    } finally {
        if (dbClient) {
            dbClient.release();
        }
    }
}
