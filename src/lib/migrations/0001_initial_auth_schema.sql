-- Este script se basa en la transformación desde 'base_schema.sql' a 'schema.sql'.

-- 1. Eliminar tablas obsoletas que ya no se utilizan en el nuevo esquema.
DROP TABLE IF EXISTS geocercas;
DROP TABLE IF EXISTS localizador_dispositivos;
DROP TABLE IF EXISTS dispositivos;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS condominios;

-- 2. Modificar la tabla 'admins' para que coincida con el esquema de destino.
-- La columna 'avatar_url' existe en el esquema base pero no en el final, por lo que se elimina.
-- Se añade IF EXISTS para que la operación no falle si se ejecuta varias veces.
ALTER TABLE admins DROP COLUMN IF EXISTS avatar_url;

-- 3. Crear las nuevas tablas que son necesarias en el esquema final.
-- Se utiliza IF NOT EXISTS para evitar errores en ejecuciones repetidas.

-- Almacena las sesiones de los administradores.
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Almacena las configuraciones de preferencias para cada administrador.
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID UNIQUE NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'es',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Insertar el usuario administrador por defecto si no existe.
-- Utiliza pgcrypto para el hash de la contraseña y ON CONFLICT para ser idempotente.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO admins (name, email, password_hash)
VALUES ('José Angel Iván Rubianes Silva', 'angelivan34@gmail.com', crypt('adminivan123', gen_salt('bf')))
ON CONFLICT (email) DO NOTHING;
