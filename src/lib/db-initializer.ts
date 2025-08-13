
'use server';

import type { PoolClient } from 'pg';
import { getDbPool } from './db';
import * as fs from 'fs/promises';
import * as path from 'path';
import bcryptjs from 'bcryptjs';

let migrationsRan = false;

export type DbInitResult = {
    success: boolean;
    message: string;
    log: string[];
};

const SCHEMA_FILES_ORDER = [
    'system/migrations_log.sql',
    'system/update_timestamp_function.sql',
    'admins/base_schema.sql',
    'condominiums/base_schema.sql',
    'residents/base_schema.sql',
    'gatekeepers/base_schema.sql',
    'device_types/base_schema.sql',
    'devices/base_schema.sql',
    'languages/base_schema.sql',
    'sessions/base_schema.sql',
    'admin_settings/base_schema.sql',
    'admin_first_login_pins/base_schema.sql',
    'admin_verification_pins/base_schema.sql',
    'admin_totp_secrets/base_schema.sql',
    'smtp_configurations/base_schema.sql',
    'themes/base_schema.sql',
    'app_settings/base_schema.sql',
    'translation_services/base_schema.sql',
    'geofences/base_schema.sql',
    'map_element_types/base_schema.sql'
];

async function executeSqlFiles(client: PoolClient, log: string[]): Promise<void> {
    log.push('PHASE 1: Starting schema creation from SQL files...');
    for (const fileName of SCHEMA_FILES_ORDER) {
        log.push(`EXECUTE: Applying schema file: ${fileName}`);
        try {
            const filePath = path.join(process.cwd(), 'src/lib/sql', fileName);
            const sqlContent = await fs.readFile(filePath, 'utf8');
            await client.query(sqlContent);
            
            // Log base files as migrations
            await client.query('INSERT INTO migrations_log (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING', [fileName]);

            log.push(`SUCCESS: Applied and logged schema: ${fileName}`);
        } catch (e: any) {
            log.push(`ERROR: Failed to apply schema file "${fileName}". Error: ${e.message}`);
            throw e;
        }
    }
}

async function seedInitialData(client: PoolClient, log: string[]): Promise<void> {
    log.push('PHASE 2: Seeding all initial data (backup)...');

    // Admin User
    try {
        const adminEmail = 'angelivan34@gmail.com';
        const correctPassword = 'adminivan123';
        const dynamicallyGeneratedHash = await bcryptjs.hash(correctPassword, 10);

        await client.query(
            "INSERT INTO admins (name, email, password_hash, can_create_admins) VALUES ($1, $2, $3, TRUE) ON CONFLICT (email) DO NOTHING",
            ['José Angel Iván Rubianes Silva', adminEmail, dynamicallyGeneratedHash]
        );
        log.push('SUCCESS: Default admin data seeded.');
    } catch (e: any) {
        log.push(`ERROR: Seeding admin data failed: ${e.message}`);
        throw e;
    }
    
    // Device Types
    try {
        const name_translations = { es: 'Teléfono Inteligente', 'pt-BR': 'Smartphone' };
        await client.query(
            'INSERT INTO device_types (name_translations) VALUES ($1) ON CONFLICT ((name_translations->>\'pt-BR\')) DO NOTHING',
            [name_translations]
        );
        log.push('SUCCESS: Default device type data seeded.');
    } catch (e: any) {
        log.push(`ERROR: Seeding device types failed: ${e.message}`);
        throw e;
    }
    
    // Languages
    try {
        const languages = [
            { id: 'en', es: 'Inglés', pt: 'Inglês' },
            { id: 'es', es: 'Español', pt: 'Espanhol' },
            { id: 'fr', es: 'Francés', pt: 'Francês' },
            { id: 'de', es: 'Alemán', pt: 'Alemão' },
            { id: 'it', es: 'Italiano', pt: 'Italiano' },
            { id: 'pt', es: 'Portugués', pt: 'Português' },
            { id: 'pt-BR', es: 'Portugués (Brasil)', pt: 'Português (Brasil)' },
            { id: 'ru', es: 'Ruso', pt: 'Russo' },
            { id: 'zh', es: 'Chino', pt: 'Chinês' },
            { id: 'ja', es: 'Japonés', pt: 'Japonês' },
            { id: 'ko', es: 'Coreano', pt: 'Coreano' },
            { id: 'ar', es: 'Árabe', pt: 'Árabe' },
            { id: 'hi', es: 'Hindi', pt: 'Híndi' },
            { id: 'bn', es: 'Bengalí', pt: 'Bengali' },
            { id: 'nl', es: 'Holandés', pt: 'Holandês' },
            { id: 'sv', es: 'Sueco', pt: 'Sueco' },
            { id: 'fi', es: 'Finlandés', pt: 'Finlandês' },
            { id: 'da', es: 'Danés', pt: 'Dinamarquês' },
            { id: 'pl', es: 'Polaco', pt: 'Polonês' },
            { id: 'uk', es: 'Ucraniano', pt: 'Ucraniano' },
            { id: 'tr', es: 'Turco', pt: 'Turco' },
            { id: 'el', es: 'Griego', pt: 'Grego' },
            { id: 'he', es: 'Hebreo', pt: 'Hebraico' },
            { id: 'th', es: 'Tailandés', pt: 'Tailandês' },
            { id: 'vi', es: 'Vietnamita', pt: 'Vietnamita' },
            { id: 'cs', es: 'Checo', pt: 'Tcheco' },
            { id: 'hu', es: 'Húngaro', pt: 'Húngaro' },
            { id: 'ro', es: 'Rumano', pt: 'Romeno' },
            { id: 'id', es: 'Indonesio', pt: 'Indonésio' }
        ];

        for (const lang of languages) {
            const name_translations = { es: lang.es, 'pt-BR': lang.pt };
            await client.query(
                'INSERT INTO languages (id, name_translations) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
                [lang.id, name_translations]
            );
        }
        log.push('SUCCESS: Default languages data seeded.');
    } catch (e: any) {
        log.push(`ERROR: Seeding languages failed: ${e.message}`);
        throw e;
    }
}

async function seedTestData(client: PoolClient, log: string[]): Promise<void> {
    log.push('PHASE 3: Seeding test data (backup)...');

    try {
        const condoResult = await client.query(
            "INSERT INTO condominiums (name, address) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING RETURNING id",
            ['Condominio Paraíso', 'Avenida Siempreviva 742']
        );
        
        const condoId = condoResult.rows[0]?.id;
        
        if (condoId) {
            const residentPassword = await bcryptjs.hash('password123', 10);
            await client.query(
                "INSERT INTO residents (condominium_id, name, email, password_hash) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING",
                [condoId, 'Juan Pérez', 'juan.perez@email.com', residentPassword]
            );
            
            const gatekeeperPassword = await bcryptjs.hash('password456', 10);
            await client.query(
                "INSERT INTO gatekeepers (condominium_id, name, email, password_hash) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING",
                [condoId, 'Pedro arias', 'pedro.arias@email.com', gatekeeperPassword]
            );
            log.push('SUCCESS: Test data (condo, resident, gatekeeper) seeded.');

            // Seed devices for the test condominium
            const deviceTypeResult = await client.query("SELECT id FROM device_types WHERE name_translations->>'pt-BR' = 'Smartphone'");
            const deviceTypeId = deviceTypeResult.rows[0]?.id;

            if (deviceTypeId) {
                await client.query(
                    "INSERT INTO devices (name, condominium_id, device_type_id, token) VALUES ($1, $2, $3, $4), ($5, $6, $7, $8) ON CONFLICT (token) DO NOTHING",
                    [
                        'iPhone de Juan', condoId, deviceTypeId, 'token_iphone_juan_123',
                        'Galaxy de Pedro', condoId, deviceTypeId, 'token_galaxy_pedro_456'
                    ]
                );
                log.push('SUCCESS: Test devices seeded for Condominio Paraíso.');
            } else {
                log.push('WARNING: Could not find "Smartphone" device type to seed test devices.');
            }

        } else {
             log.push('INFO: Test condominium already exists, skipping test user and device creation.');
        }
    } catch (e: any) {
        log.push(`ERROR: Seeding test data failed: ${e.message}`);
        throw e;
    }
}

async function runMigrations(client: PoolClient, log: string[]) {
    log.push("PHASE 4: Checking for new migrations...");
    const migrationsDir = path.join(process.cwd(), 'src/lib/sql/migrations');
    
    try {
        await fs.mkdir(migrationsDir, { recursive: true });
        const migrationFiles = (await fs.readdir(migrationsDir))
            .filter(file => file.endsWith('.sql'))
            .sort();

        if (migrationFiles.length === 0) {
            log.push("INFO: No new migration files found.");
            return;
        }

        const executedMigrationsResult = await client.query('SELECT filename FROM migrations_log');
        const executedMigrations = new Set(executedMigrationsResult.rows.map(r => r.filename));

        for (const file of migrationFiles) {
            if (!executedMigrations.has(file)) {
                log.push(`EXECUTE: Applying new migration: ${file}`);
                const filePath = path.join(migrationsDir, file);
                const sqlContent = await fs.readFile(filePath, 'utf8');
                await client.query(sqlContent);
                await client.query('INSERT INTO migrations_log (filename) VALUES ($1)', [file]);
                log.push(`SUCCESS: Applied and logged new migration: ${file}`);
            }
        }
         log.push("SUCCESS: All new migrations applied.");
    } catch (e: any) {
        log.push(`ERROR: Failed to run migrations. Error: ${e.message}`);
        throw e; // Propagate error to rollback transaction
    }
}


export async function initializeDatabase(
    prevState: DbInitResult | undefined,
    formData: FormData
): Promise<DbInitResult> {
    
    let dbClient;
    const log: string[] = [];
    
    try {
        log.push('INFO: Obtaining database pool connection...');
        const pool = await getDbPool();
        dbClient = await pool.connect();
        log.push('SUCCESS: Database pool connected.');

        await dbClient.query('BEGIN');
        log.push('INFO: Transaction started.');
        
        // Check if the base initialization has already run
        const migrationLogTable = await dbClient.query("SELECT to_regclass('public.migrations_log')");
        const isInitialSetupDone = migrationLogTable.rows[0].to_regclass !== null;

        if (!isInitialSetupDone) {
            log.push('INFO: migrations_log table not found. Running initial base setup...');
            await executeSqlFiles(dbClient, log);
            await seedInitialData(dbClient, log);
            await seedTestData(dbClient, log);
            log.push('SUCCESS: Initial base setup complete.');
        } else {
            log.push('INFO: migrations_log table found. Skipping initial base setup.');
        }

        // Always run pending migrations
        await runMigrations(dbClient, log);
        
        await dbClient.query('COMMIT');
        log.push('SUCCESS: Database is up to date.');
        
        log.push('END: Initialization process completed successfully.');
        return { success: true, message: 'O processo de inicialização do banco de dados foi concluído com sucesso.', log };

    } catch (error: any) {
        log.push(`CRITICAL: Database initialization process failed. Error: ${error.message}`);
        console.error("CRITICAL: Database initialization process failed.", error);
        
        if (dbClient) {
            try {
                await dbClient.query('ROLLBACK');
                log.push('INFO: Transaction rolled back due to error.');
            } catch (rbError: any) {
                log.push(`CRITICAL: Failed to rollback transaction. Error: ${rbError.message}`);
            }
        }
        
        return { success: false, message: `Erro de inicialização: ${error.message}`, log: log };
    } finally {
        if (dbClient) {
            dbClient.release();
        }
    }
}


export async function clearDatabase(
    prevState: DbInitResult | undefined,
    formData: FormData
): Promise<DbInitResult> {
    let dbClient;
    const log: string[] = [];

    try {
        log.push('INFO: Obtaining database pool connection for clearing...');
        const pool = await getDbPool();
        dbClient = await pool.connect();
        log.push('SUCCESS: Database pool connected.');

        await dbClient.query('BEGIN');
        log.push('INFO: Transaction started for clearing database.');

        const tablesResult = await dbClient.query(`
            SELECT tablename FROM pg_tables WHERE schemaname = 'public'
        `);
        const tables = tablesResult.rows;

        if (tables.length === 0) {
            log.push('INFO: No tables found in public schema to delete.');
        } else {
            for (const table of tables) {
                const tableName = table.tablename;
                log.push(`EXECUTE: Dropping table "${tableName}"...`);
                await dbClient.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
                log.push(`SUCCESS: Table "${tableName}" dropped.`);
            }
        }

        await dbClient.query('COMMIT');
        log.push('SUCCESS: Database cleared successfully.');
        
        return { success: true, message: 'Todas as tabelas foram removidas com sucesso.', log };

    } catch (error: any) {
        log.push(`CRITICAL: Database clearing process failed. Error: ${error.message}`);
        console.error("CRITICAL: Database clearing process failed.", error);

        if (dbClient) {
            try {
                await dbClient.query('ROLLBACK');
                log.push('INFO: Transaction rolled back due to error.');
            } catch (rbError: any) {
                log.push(`CRITICAL: Failed to rollback transaction. Error: ${rbError.message}`);
            }
        }
        
        return { success: false, message: `Erro ao limpar banco de dados: ${error.message}`, log };
    } finally {
        if (dbClient) {
            dbClient.release();
        }
    }
}
