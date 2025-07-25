-- Migration to transition from the original schema to the admin auth schema.

-- Step 1: Drop tables that are no longer in use.
-- Using IF EXISTS and CASCADE to prevent errors if they are already deleted or have dependencies.
DROP TABLE IF EXISTS "ElementosMapa" CASCADE;
DROP TABLE IF EXISTS "Geocercas" CASCADE;
DROP TABLE IF EXISTS "Dispositivos" CASCADE;
DROP TABLE IF EXISTS "Condominios" CASCADE;


-- Step 2: Transform the "Usuarios" table into "admins" if it exists.
-- This preserves the data from the original user table.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuarios') THEN
        ALTER TABLE "Usuarios" RENAME TO admins;
        RAISE NOTICE 'Table "Usuarios" renamed to "admins".';
    END IF;
END $$;

-- Step 3: Ensure the `admins` table exists and has the correct structure.
-- Create it if it doesn't exist at all.
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 4: Alter the admins table to match the final schema, only if needed.
-- This makes the script safe to re-run.
DO $$
BEGIN
    -- Rename id_usuario to id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='id_usuario') THEN
        ALTER TABLE admins RENAME COLUMN id_usuario TO id;
        RAISE NOTICE 'Column "id_usuario" renamed to "id" in "admins".';
    END IF;

    -- Rename contrasena_hash to password_hash
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='contrasena_hash') THEN
        ALTER TABLE admins RENAME COLUMN contrasena_hash TO password_hash;
        RAISE NOTICE 'Column "contrasena_hash" renamed to "password_hash" in "admins".';
    END IF;

    -- Drop columns that are no longer needed
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='tipo_usuario') THEN
        ALTER TABLE admins DROP COLUMN tipo_usuario;
        RAISE NOTICE 'Column "tipo_usuario" dropped from "admins".';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='id_condominio') THEN
        ALTER TABLE admins DROP COLUMN id_condominio;
        RAISE NOTICE 'Column "id_condominio" dropped from "admins".';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='fecha_registro') THEN
        ALTER TABLE admins DROP COLUMN fecha_registro;
        RAISE NOTICE 'Column "fecha_registro" dropped from "admins".';
    END IF;

     -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='created_at') THEN
        ALTER TABLE admins ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Column "created_at" added to "admins".';
    END IF;
END $$;


-- Step 5: Create the new sessions and admin_settings tables if they don't exist.
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_settings (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE UNIQUE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'es',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Drop the original Usuarios table if it still somehow exists
DROP TABLE IF EXISTS "Usuarios" CASCADE;
