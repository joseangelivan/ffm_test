-- Fase 1: Limpieza Radical de Tablas Obsoletas
-- Elimina todas las tablas que no forman parte del esquema de autenticación final.
-- El uso de CASCADE asegura que cualquier vista o dependencia también se elimine.
DROP TABLE IF EXISTS "condominios" CASCADE;
DROP TABLE IF EXISTS "devices" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "geofences" CASCADE;
DROP TABLE IF EXISTS "map_elements" CASCADE;
DROP TABLE IF EXISTS "element_types" CASCADE;
DROP TABLE IF EXISTS "Usuarios" CASCADE;
DROP TABLE IF EXISTS "user_preferences" CASCADE;

-- Fase 2: Creación de Estructuras Fundamentales
-- Crea las tablas necesarias para el sistema de autenticación si no existen.
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
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

-- Fase 3: Corrección de Columnas en la tabla 'admins'
-- Esto asegura que la tabla 'admins' tenga la estructura correcta,
-- eliminando columnas de versiones anteriores si existen.
ALTER TABLE admins DROP COLUMN IF EXISTS updated_at;
ALTER TABLE admins DROP COLUMN IF EXISTS avatar_url;

-- Asegura que la columna 'name' exista (por si la tabla fue creada en un estado muy temprano sin ella).
ALTER TABLE admins ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Fase 4: Inserción de Datos Iniciales
-- Instala la extensión pgcrypto si no está presente, necesaria para el hash de contraseñas.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Inserta el administrador inicial solo si el email no existe,
-- hasheando la contraseña con bcrypt para mayor seguridad.
INSERT INTO admins (name, email, password_hash)
VALUES ('José Angel Iván Rubianes Silva', 'angelivan34@gmail.com', crypt('adminivan123', gen_salt('bf')))
ON CONFLICT (email) DO NOTHING;
