-- Habilitar extensiones si no existen
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Función de trigger para actualizar el campo updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tabla de administradores
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    can_create_admins BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Trigger para la tabla admins
DROP TRIGGER IF EXISTS set_timestamp_admins ON admins;
CREATE TRIGGER set_timestamp_admins
BEFORE UPDATE ON admins
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();


-- Tabla de configuración de administradores
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light' NOT NULL,
    language VARCHAR(10) DEFAULT 'pt' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(admin_id)
);

-- Trigger para la tabla admin_settings
DROP TRIGGER IF EXISTS set_timestamp_admin_settings ON admin_settings;
CREATE TRIGGER set_timestamp_admin_settings
BEFORE UPDATE ON admin_settings
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();


-- Tabla de sesiones
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    user_type VARCHAR(50) NOT NULL, -- 'admin', 'resident', 'gatekeeper'
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Sembrar administrador por defecto (la contraseña hasheada se reemplaza en el código)
INSERT INTO admins (name, email, password_hash, can_create_admins)
VALUES ('José Angel Iván Rubianes Silva', 'angelivan34@gmail.com', '{{ADMIN_PASSWORD_HASH}}', TRUE)
ON CONFLICT (email) DO NOTHING;
