
'use server';

import type { PoolClient } from 'pg';
import { getDbPool } from './db';
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

    // --- Phase 1: Apply all base table schemas from files ---
    log.push('PHASE: Applying all schemas from .sql files...');
    for (const filePath of SCHEMA_FILES_ORDER) {
        await applyAndLogSchema(client, filePath, log);
    }
    log.push('SUCCESS: All base schemas applied.');

    // --- Phase 2: Apply all non-destructive migrations ---
    log.push('PHASE: Applying non-destructive migrations (if any)...');
    
    // Check and add columns to 'residents' table if they don't exist
    const residentColumns = ['location', 'housing', 'phone'];
    for (const col of residentColumns) {
        const colExists = await client.query(`
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'residents' AND column_name = $1
        `, [col]);
        if (colExists.rows.length === 0) {
            log.push(`ALTER: Column "${col}" does not exist in "residents". Adding it.`);
            await client.query(`ALTER TABLE residents ADD COLUMN ${col} VARCHAR(255)`);
            log.push(`SUCCESS: Column "${col}" added to "residents".`);
        } else {
            log.push(`SKIP: Column "${col}" already exists in "residents".`);
        }
    }
    
    // Check and add columns to 'gatekeepers' table if they don't exist
    const gatekeeperColumns = ['location', 'housing', 'phone'];
    for (const col of gatekeeperColumns) {
        const colExists = await client.query(`
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'gatekeepers' AND column_name = $1
        `, [col]);
        if (colExists.rows.length === 0) {
            log.push(`ALTER: Column "${col}" does not exist in "gatekeepers". Adding it.`);
            await client.query(`ALTER TABLE gatekeepers ADD COLUMN ${col} VARCHAR(255)`);
            log.push(`SUCCESS: Column "${col}" added to "gatekeepers".`);
        } else {
            log.push(`SKIP: Column "${col}" already exists in "gatekeepers".`);
        }
    }
    log.push('SUCCESS: Non-destructive migrations phase completed.');
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
