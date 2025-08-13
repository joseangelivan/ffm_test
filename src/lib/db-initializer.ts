
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
            log.push(`SUCCESS: Applied schema: ${fileName}`);
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
        } else {
             log.push('INFO: Test condominium already exists, skipping test user creation.');
        }
    } catch (e: any) {
        log.push(`ERROR: Seeding test data failed: ${e.message}`);
        throw e;
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
        
        await executeSqlFiles(dbClient, log);
        await seedInitialData(dbClient, log);
        await seedTestData(dbClient, log);
        
        await dbClient.query('COMMIT');
        log.push('SUCCESS: All schemas created and initial data seeded.');
        
        migrationsRan = true;
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
