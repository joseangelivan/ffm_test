-- Este script transforma la base de datos desde base_schema.sql al nuevo schema.sql

-- Paso 1: Eliminar tablas obsoletas.
-- El orden es importante para respetar las dependencias de claves foráneas.
DROP TABLE IF EXISTS localizador_dispositivos;
DROP TABLE IF EXISTS dispositivos;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS geocercas;
DROP TABLE IF EXISTS condominios;

-- Paso 2: Modificar tablas existentes.
-- Eliminar la columna avatar_url de la tabla admins si existe.
ALTER TABLE admins DROP COLUMN IF EXISTS avatar_url;


-- Paso 3: Crear nuevas tablas.
-- Crear la tabla de sesiones si no existe.
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear la tabla de configuraciones de administrador si no existe.
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(255) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'es',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paso 4: Insertar datos por defecto.
-- hasheando la contraseña con bcrypt para mayor seguridad.
INSERT INTO admins (name, email, password_hash)
VALUES ('José Angel Iván Rubianes Silva', 'angelivan34@gmail.com', crypt('adminivan123', gen_salt('bf')))
ON CONFLICT (email) DO NOTHING;
