
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
    'admins/base_schema.sql',
    'condominiums/base_schema.sql',
    'residents/base_schema.sql',
    'gatekeepers/base_schema.sql',
    'device_types/base_schema.sql',
    'protocols/base_schema.sql',
    'devices/base_schema.sql',
    'languages/base_schema.sql',
    'sessions/base_schema.sql',
    'admin_settings/base_schema.sql',
    'smtp_configurations/base_schema.sql',
    'themes/base_schema.sql',
    'app_settings/base_schema.sql',
    'translation_services/base_schema.sql',
    'maps/base_schema.sql',
];

async function applySqlFile(client: PoolClient, filePath: string, log: string[]): Promise<void> {
    const fileName = path.basename(filePath);
    log.push(`EXECUTE: Applying schema file: ${fileName}`);
    try {
        const fullPath = path.join(process.cwd(), 'src/lib/sql', filePath);
        const sqlContent = await fs.readFile(fullPath, 'utf8');
        await client.query(sqlContent);
        log.push(`SUCCESS: Applied schema: ${fileName}`);
    } catch (e: any) {
        log.push(`ERROR: Failed to apply schema file "${fileName}". Error: ${e.message}`);
        throw e;
    }
}

async function ensureSystemObjects(client: PoolClient, log: string[]): Promise<void> {
    log.push('PHASE 1: Ensuring core system objects exist...');
    await applySqlFile(client, 'system/update_timestamp_function.sql', log);
    await applySqlFile(client, 'system/migrations_log.sql', log);
    log.push('SUCCESS: Core system objects are in place.');
}


async function runBaseSchemas(client: PoolClient, log: string[]): Promise<void> {
    log.push('PHASE 2: Applying base schemas...');
    
    const executedResult = await client.query('SELECT filename FROM migrations_log');
    const executedFiles = new Set(executedResult.rows.map(r => r.filename));

    for (const fileName of SCHEMA_FILES_ORDER) {
        if (!executedFiles.has(fileName)) {
            await applySqlFile(client, fileName, log);
            await client.query('INSERT INTO migrations_log (filename) VALUES ($1)', [fileName]);
            log.push(`INFO: Logged base schema "${fileName}" as migrated.`);
        } else {
            log.push(`INFO: Base schema "${fileName}" already migrated, skipping.`);
        }
    }
     log.push('SUCCESS: All base schemas are up to date.');
}


async function seedInitialData(client: PoolClient, log: string[]): Promise<void> {
    log.push('PHASE 3: Seeding all initial data (backup)...');

    // Admin User
    try {
        const adminName = process.env.ADMIN_NAME;
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        const canCreateAdmins = process.env.ADMIN_CAN_CREATE_ADMINS === 'true';

        if (!adminName || !adminEmail || !adminPassword) {
            log.push('WARNING: ADMIN_NAME, ADMIN_EMAIL, or ADMIN_PASSWORD environment variables not set. Skipping default admin creation.');
        } else {
            const hashedPassword = await bcryptjs.hash(adminPassword, 10);
            await client.query(
                "INSERT INTO admins (name, email, password_hash, can_create_admins) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING",
                [adminName, adminEmail, hashedPassword, canCreateAdmins]
            );
            log.push('SUCCESS: Default admin data seeded from environment variables.');
        }
    } catch (e: any) {
        log.push(`ERROR: Seeding admin data failed: ${e.message}`);
        throw e;
    }
    
    // Device Types
    try {
        const name_translations = { es: 'Teléfono Inteligente', 'pt-BR': 'Smartphone' };
        await client.query(
            'INSERT INTO device_types (name_translations) VALUES ($1) ON CONFLICT ON CONSTRAINT unique_device_type_name_translations DO NOTHING',
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
    log.push('PHASE 4: Seeding test data (backup)...');

    try {
        const testCondoName = 'Condominio Paraíso';
        let condoId: string;

        const existingCondo = await client.query('SELECT id FROM condominiums WHERE name = $1', [testCondoName]);
        if (existingCondo.rows.length > 0) {
            condoId = existingCondo.rows[0].id;
            log.push(`INFO: Test condominium "${testCondoName}" already exists.`);
        } else {
            const newCondoResult = await client.query(
                "INSERT INTO condominiums (name, continent, country, state, city, street, number) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
                [testCondoName, 'Americas', 'Brazil', 'São Paulo', 'São Paulo', 'Avenida Paulista', '1000']
            );
            condoId = newCondoResult.rows[0].id;
            log.push(`SUCCESS: Created test condominium "${testCondoName}".`);
        }
        
        const residentPassword = await bcryptjs.hash('password123', 10);
        await client.query(
            "INSERT INTO residents (condominium_id, name, email, password_hash) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING",
            [condoId, 'Juan Pérez', 'juan.perez@email.com', residentPassword]
        );
        
        const gatekeeperPassword = await bcryptjs.hash('password456', 10);
        await client.query(
            "INSERT INTO gatekeepers (condominium_id, name, email, password_hash) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING",
            [condoId, 'Pedro Arias', 'pedro.arias@email.com', gatekeeperPassword]
        );
        log.push('INFO: Test users seeded (or already exist).');
        
        const smartphoneTypeResult = await client.query("SELECT id FROM device_types WHERE name_translations->>'pt-BR' = 'Smartphone'");
        const smartphoneTypeId = smartphoneTypeResult.rows[0]?.id;

        if (smartphoneTypeId) {
            const device1Name = 'iPhone de Juan';
             await client.query(
                `INSERT INTO devices (condominium_id, device_type_id, name)
                 SELECT $1, $2, $3
                 WHERE NOT EXISTS (SELECT 1 FROM devices WHERE condominium_id = $1 AND name = $3)`,
                [condoId, smartphoneTypeId, device1Name]
            );

            const device2Name = 'Galaxy de Pedro';
            await client.query(
                `INSERT INTO devices (condominium_id, device_type_id, name)
                 SELECT $1, $2, $3
                 WHERE NOT EXISTS (SELECT 1 FROM devices WHERE condominium_id = $1 AND name = $3)`,
                [condoId, smartphoneTypeId, device2Name]
            );
            log.push('INFO: Test devices seeded (or already exist).');
        } else {
            log.push('WARNING: Could not find "Smartphone" device type to seed test devices.');
        }

    } catch (e: any) {
        log.push(`ERROR: Seeding test data failed: ${e.message}`);
        throw e;
    }
}


async function runMigrations(client: PoolClient, log: string[]) {
    log.push("PHASE 5: Checking for new migrations...");
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
            const migrationLogName = `migrations/${file}`;
            if (!executedMigrations.has(migrationLogName)) {
                log.push(`EXECUTE: Applying new migration: ${file}`);
                const filePath = path.join(migrationsDir, file);
                const sqlContent = await fs.readFile(filePath, 'utf8');
                await client.query(sqlContent);
                await client.query('INSERT INTO migrations_log (filename) VALUES ($1)', [migrationLogName]);
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
        
        // Always ensure system objects like migrations_log table exist first.
        await ensureSystemObjects(dbClient, log);

        // Run base schemas if they haven't been logged yet.
        await runBaseSchemas(dbClient, log);

        // Seed initial data required for the app to function.
        await seedInitialData(dbClient, log);

        // Seed optional test data.
        await seedTestData(dbClient, log);
        
        // Always run pending migrations from the migrations folder
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
