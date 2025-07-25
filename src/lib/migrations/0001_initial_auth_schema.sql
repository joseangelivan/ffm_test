-- Fase 1: Limpieza Radical de Tablas Obsoletas
-- Se eliminan todas las tablas que no pertenecen al esquema de autenticación final.
-- El uso de CASCADE asegura que las dependencias (como foreign keys) se eliminen también.

DROP TABLE IF EXISTS "condominios" CASCADE;
DROP TABLE IF EXISTS "devices" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "geofences" CASCADE;
DROP TABLE IF EXISTS "map_elements" CASCADE;
DROP TABLE IF EXISTS "element_types" CASCADE;
DROP TABLE IF EXISTS "Usuarios" CASCADE;
DROP TABLE IF EXISTS "user_preferences" CASCADE;

-- Fase 2: Creación y Sincronización de Tablas del Esquema Final
-- Se asegura que las tablas requeridas por la aplicación existan con la estructura correcta.

CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID UNIQUE NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'es',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fase 3: Auditoría y Modificación de Columnas
-- Se asegura que las tablas existentes tengan todas las columnas necesarias.

-- Añade la columna 'name' a 'admins' solo si no existe.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='name') THEN
        ALTER TABLE admins ADD COLUMN name VARCHAR(255);
    END IF;
END
$$;

-- Asegura que las columnas de timestamp 'created_at' y 'updated_at' existan en 'admins'.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='created_at') THEN
        ALTER TABLE admins ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='updated_at') THEN
        ALTER TABLE admins ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END
$$;

-- Habilita la extensión pgcrypto si no está habilitada, necesaria para bcrypt.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Fase 4: Inserción Segura del Administrador Inicial
-- Inserta el usuario administrador solo si no existe, evitando duplicados.
-- La contraseña se hashea usando crypt(), compatible con bcrypt.

INSERT INTO admins (name, email, password_hash)
VALUES ('José Angel Iván Rubianes Silva', 'angelivan34@gmail.com', crypt('adminivan123', gen_salt('bf')))
ON CONFLICT (email) DO NOTHING;
