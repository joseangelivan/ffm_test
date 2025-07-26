-- Este script transforma la base de datos del esquema inicial al esquema de autenticación.

-- 1. Eliminar tablas que ya no se utilizan en el nuevo esquema.
-- El orden es importante para respetar las dependencias de claves foráneas.
DROP TABLE IF EXISTS localizador_dispositivos;
DROP TABLE IF EXISTS dispositivos;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS geocercas;
DROP TABLE IF EXISTS condominios;

-- 2. Modificar tablas existentes.
-- Eliminar la columna avatar_url de la tabla admins si existe.
ALTER TABLE IF EXISTS admins DROP COLUMN IF EXISTS avatar_url;

-- 3. Crear las nuevas tablas para el sistema de autenticación.
-- Crear tabla de sesiones
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de configuraciones de administrador
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light' NOT NULL,
    language VARCHAR(10) DEFAULT 'es' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 4. Insertar el usuario administrador por defecto si no existe.
-- Instala la extensión pgcrypto si no está presente, necesaria para el hash de contraseñas.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- hasheando la contraseña con bcrypt para mayor seguridad.
INSERT INTO admins (name, email, password_hash)
VALUES ('José Angel Iván Rubianes Silva', 'angelivan34@gmail.com', crypt('adminivan123', gen_salt('bf')))
ON CONFLICT (email) DO NOTHING;
