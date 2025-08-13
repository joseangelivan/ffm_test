
'use server';

import type { PoolClient } from 'pg';
import { getDbPool } from './db';
import * as fs from 'fs/promises';
import * as path from 'path';

let migrationsRan = false;

export type DbInitResult = {
    success: boolean;
    message: string;
    log: string[];
};

async function runDatabaseMigrations(client: PoolClient, log: string[]): Promise<void> {
    log.push('PHASE: Starting database migration process...');

    // 1. Ensure migrations log table exists
    try {
        const migrationsTableSql = await fs.readFile(path.join(process.cwd(), 'src/lib/sql/system/migrations_log.sql'), 'utf8');
        await client.query(migrationsTableSql);
        log.push('SUCCESS: Migration log table is ready.');
    } catch (e: any) {
        log.push(`FATAL: Could not create migrations_log table. Error: ${e.message}`);
        throw e;
    }

    // 2. Get already applied migrations
    const { rows: appliedMigrations } = await client.query('SELECT file_name FROM migrations_log');
    const appliedFiles = new Set(appliedMigrations.map(row => row.file_name));
    log.push(`INFO: Found ${appliedFiles.size} already applied migrations.`);

    // 3. Read all available migration files
    const migrationsDir = path.join(process.cwd(), 'src/lib/sql/migrations');
    const allMigrationFiles = await fs.readdir(migrationsDir);

    // 4. Filter to get pending migrations and sort them
    const pendingMigrations = allMigrationFiles
        .filter(file => file.endsWith('.sql') && !appliedFiles.has(file))
        .sort((a, b) => a.localeCompare(b));

    if (pendingMigrations.length === 0) {
        log.push('INFO: No new migrations to apply. Database is up-to-date.');
        return;
    }

    log.push(`INFO: Found ${pendingMigrations.length} new migrations to apply.`);

    // 5. Apply pending migrations one by one
    for (const fileName of pendingMigrations) {
        log.push(`APPLY: Applying migration: ${fileName}`);
        try {
            const filePath = path.join(migrationsDir, fileName);
            const sqlContent = await fs.readFile(filePath, 'utf8');
            
            await client.query(sqlContent);
            await client.query('INSERT INTO migrations_log (file_name) VALUES ($1)', [fileName]);
            
            log.push(`SUCCESS: Successfully applied and logged migration: ${fileName}`);
        } catch (migrationError: any) {
            log.push(`ERROR: FAILED to apply migration file "${fileName}". Error: ${migrationError.message}`);
            throw migrationError;
        }
    }
}

export async function initializeDatabase(
    prevState: DbInitResult | undefined,
    formData: FormData
): Promise<DbInitResult> {
    if (migrationsRan) {
        return { success: true, message: 'As migrações já foram executadas nesta instância do servidor.', log: ['INFO: As migrações já foram executadas nesta instância. Ignorando.'] };
    }
    
    let dbClient;
    const log: string[] = [];
    
    try {
        log.push('INFO: Obtaining database pool connection...');
        const pool = await getDbPool();
        dbClient = await pool.connect();
        log.push('SUCCESS: Database pool connected.');

        await dbClient.query('BEGIN');
        log.push('INFO: Transaction started.');
        
        await runDatabaseMigrations(dbClient, log);
        
        await dbClient.query('COMMIT');
        log.push('SUCCESS: All pending migrations have been committed.');
        
        migrationsRan = true;
        log.push('END: Migration process completed successfully.');
        return { success: true, message: 'O processo de migração do banco de dados foi concluído com sucesso.', log };

    } catch (error: any) {
        log.push(`CRITICAL: Database migration process failed. Error: ${error.message}`);
        console.error("CRITICAL: Database migration process failed.", error);
        
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
