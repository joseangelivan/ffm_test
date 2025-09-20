
'use server';

import type { PoolClient } from 'pg';
import { getDbPool } from './db';
import * as fs from 'fs/promises';
import * as path from 'path';
import bcryptjs from 'bcryptjs';

export type DbInitResult = {
    success: boolean;
    message: string;
    log: string[];
};

const SCHEMA_FILES_ORDER = [
    'system/migrations_log.sql',
    'system/trigger_set_timestamp_function.sql',
    'system/utils.sql',
    'system/sessions/base_schema.sql',
    'admins/base_schema.sql',
    'condominiums/base_schema.sql',
    'residents/base_schema.sql',
    'gatekeepers/base_schema.sql',
    'catalogs/base_schema.sql',
    'devices/base_schema.sql',
    'admin_settings/base_schema.sql',
    'smtp_configurations/base_schema.sql',
    'themes/base_schema.sql',
    'app_settings/base_schema.sql',
    'translation_services/base_schema.sql',
    'maps/base_schema.sql',
    'geocoding_services/base_schema.sql',
    'map_providers/base_schema.sql',
    'address_services/base_schema.sql',
];

const SEED_FILES_ORDER = [
    'catalogs/seed.sql',
    'map_providers/seed.sql',
    'address_services/seed.sql',
];

async function applySqlFile(client: PoolClient, filePath: string, log: string[]): Promise<void> {
    const fileName = path.basename(filePath);
    log.push(`EXECUTE: Applying SQL file: ${fileName}`);
    try {
        const fullPath = path.join(process.cwd(), 'src/lib/sql', filePath);
        const sqlContent = await fs.readFile(fullPath, 'utf8');
        await client.query(sqlContent);
        log.push(`SUCCESS: Applied SQL file: ${fileName}`);
    } catch (e: any) {
        log.push(`ERROR: Failed to apply SQL file "${fileName}". Error: ${e.message}`);
        throw e;
    }
}

async function ensureSystemObjects(client: PoolClient, log: string[]): Promise<void> {
    log.push('PHASE 1: Ensuring core system objects exist...');
    await applySqlFile(client, 'system/migrations_log.sql', log);
    await applySqlFile(client, 'system/trigger_set_timestamp_function.sql', log);
    await applySqlFile(client, 'system/utils.sql', log);
    log.push('SUCCESS: Core system objects are in place.');
}


async function runBaseSchemas(client: PoolClient, log: string[]): Promise<void> {
    log.push('PHASE 2: Applying base schemas...');
    
    // Execute all base schema files on every initialization.
    // This works because we use idempotent statements like
    // `CREATE TABLE IF NOT EXISTS` and `CREATE OR REPLACE TRIGGER/FUNCTION`.
    for (const fileName of SCHEMA_FILES_ORDER) {
        // The file might not exist if it's a new setup, so we handle that.
        const fullPath = path.join(process.cwd(), 'src/lib/sql', fileName);
        try {
            await fs.access(fullPath); // Check if file exists
            await applySqlFile(client, fileName, log);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                log.push(`INFO: SQL file not found, skipping: ${fileName}`);
            } else {
                throw error; // Re-throw other errors
            }
        }
    }
    
    log.push('SUCCESS: All base schemas applied.');
}


async function seedInitialData(client: PoolClient, log: string[]): Promise<void> {
    log.push('PHASE 3: Seeding all initial data...');

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
    
    // Catalogs and other seed files
    for (const fileName of SEED_FILES_ORDER) {
        try {
            await applySqlFile(client, fileName, log);
        } catch (e: any) {
            // Log the error but continue if possible, some seeds might fail if data exists
            log.push(`WARNING: Seeding from "${fileName}" failed: ${e.message}. This may be okay if data already exists.`);
        }
    }
}

async function seedTestData(client: PoolClient, log: string[]): Promise<void> {
    log.push('PHASE 4: Seeding test data...');

    try {
        const testCondoName = 'Condominio Paraíso';
        let condoId: string;

        const existingCondo = await client.query('SELECT id FROM condominiums WHERE name = $1', [testCondoName]);
        if (existingCondo.rows.length > 0) {
            condoId = existingCondo.rows[0].id;
            log.push(`INFO: Test condominium "${testCondoName}" already exists.`);
        } else {
            const newCondoResult = await client.query(
                "INSERT INTO condominiums (name, region, country, state, city, street, number) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
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
                `INSERT INTO devices (condominium_id, device_type_id, name) VALUES ($1, $2, $3) ON CONFLICT (condominium_id, name) DO NOTHING`,
                [condoId, smartphoneTypeId, device1Name]
            );

            const device2Name = 'Galaxy de Pedro';
            await client.query(
                `INSERT INTO devices (condominium_id, device_type_id, name) VALUES ($1, $2, $3) ON CONFLICT (condominium_id, name) DO NOTHING`,
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

async function applyRlsPolicies(client: PoolClient, log: string[]): Promise<void> {
    log.push('PHASE 6: Applying Row Level Security policies...');

    const tablesResult = await client.query(`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `);
    const tables = tablesResult.rows;

    if (tables.length === 0) {
        log.push('WARNING: No tables found in public schema to apply RLS policies.');
        return;
    }

    for (const table of tables) {
        const tableName = table.tablename;
        try {
            log.push(`INFO: Applying RLS for table: ${tableName}`);
            // Enable RLS
            await client.query(`ALTER TABLE public."${tableName}" ENABLE ROW LEVEL SECURITY;`);

            // Drop existing policy if it exists, to ensure a clean slate
            await client.query(`DROP POLICY IF EXISTS "service_policy_public" ON public."${tableName}";`);

            // Create a fully permissive policy. Since our backend connects with a privileged role,
            // this policy allows the backend to perform any action, while RLS is still enabled
            // as a security baseline.
            await client.query(`
                CREATE POLICY "service_policy_public" ON public."${tableName}"
                FOR ALL
                TO public
                USING (true)
                WITH CHECK (true);
            `);
            log.push(`SUCCESS: RLS policy applied for table: ${tableName}`);
        } catch (e: any) {
             log.push(`ERROR: Failed to apply RLS for table "${tableName}". Error: ${e.message}`);
             throw e; // Propagate error to rollback transaction
        }
    }
    log.push('SUCCESS: All RLS policies applied.');
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
        if (!pool) {
            throw new Error("Failed to get database pool. Check connection details.");
        }
        dbClient = await pool.connect();
        log.push('SUCCESS: Database pool connected.');

        await dbClient.query('BEGIN');
        log.push('INFO: Transaction started.');
        
        // Run all base schemas. This is idempotent.
        await runBaseSchemas(dbClient, log);

        // Seed initial data required for the app to function.
        await seedInitialData(dbClient, log);

        // Seed optional test data.
        await seedTestData(dbClient, log);
        
        // Always run pending migrations from the migrations folder
        await runMigrations(dbClient, log);

        // Apply RLS policies as a final step
        await applyRlsPolicies(dbClient, log);
        
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
        if (!pool) {
            throw new Error("Failed to get database pool. Check connection details.");
        }
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
                await dbClient.query(`DROP TABLE IF EXISTS public."${tableName}" CASCADE`);
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
