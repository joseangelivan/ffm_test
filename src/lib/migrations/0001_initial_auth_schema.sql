-- Este script transforma la base de datos desde base_schema.sql al nuevo schema.sql

-- Eliminar tablas antiguas que ya no se utilizan.
-- Se utiliza CASCADE para eliminar automáticamente las dependencias (foreign keys).
DROP TABLE IF EXISTS localizador_dispositivos CASCADE;
DROP TABLE IF EXISTS geocercas CASCADE;
DROP TABLE IF EXISTS dispositivos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS condominios CASCADE;

-- Modificar tablas existentes para que coincidan con el nuevo esquema.
-- Eliminar la columna 'avatar_url' de la tabla 'admins' si existe.
ALTER TABLE admins DROP COLUMN IF EXISTS avatar_url;

-- Crear nuevas tablas requeridas por el nuevo esquema.
-- Se utiliza IF NOT EXISTS para evitar errores si las tablas ya existen.
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(255) NOT NULL DEFAULT 'light',
    language VARCHAR(10) NOT NULL DEFAULT 'es',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar que la extensión pgcrypto esté instalada para el hash de contraseñas.
-- CREATE EXTENSION se maneja en 0000_install_extensions.sql para evitar errores de transacción.

-- Insertar el usuario administrador por defecto si no existe.
-- Se utiliza ON CONFLICT para evitar la inserción duplicada y errores.
-- La contraseña 'adminivan123' se hashea de forma segura con bcrypt.
INSERT INTO admins (name, email, password_hash)
VALUES ('José Angel Iván Rubianes Silva', 'angelivan34@gmail.com', crypt('adminivan123', gen_salt('bf')))
ON CONFLICT (email) DO NOTHING;
