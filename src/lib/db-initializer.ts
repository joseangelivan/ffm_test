
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

const SCHEMAS: { [key: string]: string } = {
    'migrations_log': `
        CREATE TABLE IF NOT EXISTS migrations_log (
            id SERIAL PRIMARY KEY,
            file_name VARCHAR(255) UNIQUE NOT NULL,
            applied_at TIMESTAMPTZ DEFAULT NOW()
        );
    `,
    'catalogs': `
        CREATE TABLE IF NOT EXISTS device_types (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name_translations JSONB NOT NULL,
            features_translations JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS languages (
            id VARCHAR(10) PRIMARY KEY,
            name_translations JSONB NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    `,
    'admins': `
        CREATE TABLE IF NOT EXISTS admins (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255),
            can_create_admins BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS admin_first_login_pins (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
            pin_hash VARCHAR(255) NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            UNIQUE(admin_id)
        );
        CREATE TABLE IF NOT EXISTS admin_verification_pins (
            admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
            pin VARCHAR(6) NOT NULL,
            email VARCHAR(255) NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL
        );
        CREATE TABLE IF NOT EXISTS admin_totp_secrets (
            admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
            secret VARCHAR(255) NOT NULL
        );
    `,
    'themes': `
        CREATE TABLE IF NOT EXISTS themes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL UNIQUE,
            background_hsl TEXT NOT NULL,
            foreground_hsl TEXT NOT NULL,
            card_hsl TEXT NOT NULL,
            card_foreground_hsl TEXT NOT NULL,
            popover_hsl TEXT NOT NULL,
            popover_foreground_hsl TEXT NOT NULL,
            primary_hsl TEXT NOT NULL,
            primary_foreground_hsl TEXT NOT NULL,
            secondary_hsl TEXT NOT NULL,
            secondary_foreground_hsl TEXT NOT NULL,
            muted_hsl TEXT NOT NULL,
            muted_foreground_hsl TEXT NOT NULL,
            accent_hsl TEXT NOT NULL,
            accent_foreground_hsl TEXT NOT NULL,
            destructive_hsl TEXT NOT NULL,
            destructive_foreground_hsl TEXT NOT NULL,
            border_hsl TEXT NOT NULL,
            input_hsl TEXT NOT NULL,
            ring_hsl TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    `,
    'settings': `
        CREATE TABLE IF NOT EXISTS app_settings (
            id VARCHAR(255) PRIMARY KEY,
            value TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS admin_settings (
            admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
            theme VARCHAR(255) DEFAULT 'light',
            language VARCHAR(10) DEFAULT 'pt-BR',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    `,
     'smtp': `
        CREATE TABLE IF NOT EXISTS smtp_configurations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            host VARCHAR(255) NOT NULL,
            port INTEGER NOT NULL,
            secure BOOLEAN DEFAULT TRUE,
            auth_user VARCHAR(255) NOT NULL,
            auth_pass TEXT NOT NULL,
            priority INTEGER NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    `,
    'condominiums': `
        CREATE TABLE IF NOT EXISTS condominiums (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL UNIQUE,
            continent VARCHAR(255),
            country VARCHAR(255),
            state VARCHAR(255),
            city VARCHAR(255),
            street VARCHAR(255),
            "number" VARCHAR(50),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    `,
    'residents': `
        CREATE TABLE IF NOT EXISTS residents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            location TEXT,
            housing TEXT,
            phone TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    `,
    'gatekeepers': `
        CREATE TABLE IF NOT EXISTS gatekeepers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            location TEXT,
            housing TEXT,
            phone TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    `,
    'sessions': `
        CREATE TABLE IF NOT EXISTS sessions (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL,
            user_type VARCHAR(50) NOT NULL,
            token TEXT NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    `,
    'devices': `
        CREATE TABLE IF NOT EXISTS devices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
            resident_id UUID REFERENCES residents(id) ON DELETE SET NULL,
            device_type_id UUID REFERENCES device_types(id) ON DELETE SET NULL,
            name VARCHAR(255) NOT NULL,
            token TEXT NOT NULL UNIQUE,
            last_location POINT,
            last_seen TIMESTAMPTZ,
            battery_level INTEGER,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    `,
    'maps': `
        CREATE TABLE IF NOT EXISTS geofences (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            geometry JSONB NOT NULL,
            is_default BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS map_element_types (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            icon_svg TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    `,
    'translation': `
        CREATE TABLE IF NOT EXISTS translation_services (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            config_json JSONB NOT NULL,
            is_default BOOLEAN DEFAULT FALSE,
            supported_languages JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    `
};


async function applyAndLogSchema(client: PoolClient, key: string, sql: string, log: string[]): Promise<void> {
    log.push(`CHECK: Checking schema: ${key}`);
    const hasRunResult = await client.query('SELECT 1 FROM migrations_log WHERE file_name = $1', [key]);
    if (hasRunResult.rows.length > 0) {
        log.push(`SKIP: Schema already applied: ${key}`);
        return;
    }

    try {
        log.push(`APPLY: Applying schema: ${key}`);
        await client.query(sql);
        await client.query('INSERT INTO migrations_log (file_name) VALUES ($1)', [key]);
        log.push(`SUCCESS: Successfully applied and logged: ${key}`);
    } catch (migrationError: any) {
        log.push(`ERROR: FAILED to apply schema "${key}". Error: ${migrationError.message}`);
        throw migrationError;
    }
}


async function runDatabaseSetup(client: PoolClient, log: string[]): Promise<void> {
    const bcryptjs = (await import('bcryptjs')).default;

    // --- Phase 1: Apply all schemas in order ---
    log.push('PHASE: Applying all schemas...');
    const schemaOrder = [
        'migrations_log', 'catalogs', 'admins', 'themes', 'settings', 'smtp', 'condominiums', 
        'residents', 'gatekeepers', 'sessions', 'devices', 'maps', 'translation'
    ];
    for (const key of schemaOrder) {
        await applyAndLogSchema(client, key, SCHEMAS[key], log);
    }
    log.push('SUCCESS: All schemas applied.');

    // --- Phase 2: Seed all initial data ---
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
    const adminEmail = 'angelivan34@gmail.com';
    const correctPassword = 'adminivan123';
    
    const adminResult = await client.query('SELECT id, password_hash FROM admins WHERE email = $1', [adminEmail]);
    if (adminResult.rows.length === 0) {
        log.push('SEED: Default admin not found. Seeding...');
        const dynamicallyGeneratedHash = await bcryptjs.hash(correctPassword, 10);
        await client.query(
            "INSERT INTO admins (name, email, password_hash, can_create_admins) VALUES ($1, $2, $3, TRUE) ON CONFLICT (email) DO NOTHING",
            ['José Angel Iván Rubianes Silva', adminEmail, dynamicallyGeneratedHash]
        );
        log.push('SUCCESS: Default admin user seeded.');
    } else {
        const admin = adminResult.rows[0];
        const passwordMatch = await bcryptjs.compare(correctPassword, admin.password_hash);
        if (!passwordMatch) {
            log.push('SEED: Default admin found, but password does not match. Updating hash...');
            const newHash = await bcryptjs.hash(correctPassword, 10);
            await client.query('UPDATE admins SET password_hash = $1 WHERE id = $2', [newHash, admin.id]);
            log.push('SUCCESS: Default admin password hash updated.');
        } else {
            log.push('SKIP: Default admin user found and password is correct.');
        }
    }

    // --- Phase 3: Seed Test Data ---
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
