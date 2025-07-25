-- Migration from the original base schema to the current auth-focused schema.
-- This script preserves the 'admins' table and its data, altering it as needed.

-- Step 1: Drop tables that are no longer in use in the new schema.
DROP TABLE IF EXISTS "elementosmapa" CASCADE;
DROP TABLE IF EXISTS "geocercas" CASCADE;
DROP TABLE IF EXISTS "dispositivos" CASCADE;
-- The 'usuarios' table from the old schema is being replaced by 'admins'.
-- We assume user data has been migrated or is handled separately.
DROP TABLE IF EXISTS "usuarios" CASCADE; 
DROP TABLE IF EXISTS "condominios" CASCADE;

-- Step 2: Create the 'admins' table if it doesn't exist.
-- This is a safeguard. If 'admins' already exists from previous manual setups,
-- the ALTER statements below will handle it.
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Alter the existing 'admins' table to match the new schema, preserving data.
-- This assumes the old 'admins' table was based on the 'Usuarios' table structure.
-- We use DO/BEGIN/END blocks to handle potential errors if columns don't exist.

-- Rename password column for clarity
DO $$
BEGIN
   IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='contrasena_hash') THEN
      ALTER TABLE admins RENAME COLUMN contrasena_hash TO password_hash;
   END IF;
END $$;

-- Drop unused columns
DO $$
BEGIN
   IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='tipo_usuario') THEN
      ALTER TABLE admins DROP COLUMN tipo_usuario;
   END IF;
END $$;

DO $$
BEGIN
   IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='id_condominio') THEN
      ALTER TABLE admins DROP COLUMN id_condominio;
   END IF;
END $$;

DO $$
BEGIN
   IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='fecha_registro') THEN
      ALTER TABLE admins DROP COLUMN fecha_registro;
   END IF;
END $$;

-- Add new columns if they don't exist
DO $$
BEGIN
   IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='created_at') THEN
      ALTER TABLE admins ADD COLUMN created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
   END IF;
END $$;

DO $$
BEGIN
   IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='updated_at') THEN
      ALTER TABLE admins ADD COLUMN updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
   END IF;
END $$;


-- Step 4: Create the new tables for session management and admin settings.
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_settings (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'es',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
