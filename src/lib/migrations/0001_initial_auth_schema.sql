-- Eliminar tablas que ya no están en el esquema final
DROP TABLE IF EXISTS condominios CASCADE;
DROP TABLE IF EXISTS geofences CASCADE;
DROP TABLE IF EXISTS localizador_dispositivos CASCADE;
DROP TABLE IF EXISTS dispositivos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- Modificar la tabla admins para que coincida con el esquema final sin perder datos
-- Eliminar la columna condominio_id que ya no se usa
ALTER TABLE admins DROP COLUMN IF EXISTS condominio_id;

-- Eliminar columnas de un sistema de autenticación anterior
ALTER TABLE admins DROP COLUMN IF EXISTS salt;
ALTER TABLE admins DROP COLUMN IF EXISTS reset_token;
ALTER TABLE admins DROP COLUMN IF EXISTS reset_token_expires_at;

-- Crear la tabla admin_settings si no existe y añadir las nuevas columnas
CREATE TABLE IF NOT EXISTS admin_settings (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(255) DEFAULT 'light',
    language VARCHAR(255) DEFAULT 'es',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Añadir columnas a admin_settings si la tabla ya existía pero no las tenía
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS theme VARCHAR(255) DEFAULT 'light';
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS language VARCHAR(255) DEFAULT 'es';
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Crear la tabla de migraciones si no existe
CREATE TABLE IF NOT EXISTS schema_migrations (
    migration_name VARCHAR(255) PRIMARY KEY,
    sql_script TEXT,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);