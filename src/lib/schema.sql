-- Esquema base de la base de datos.
-- Este archivo representa el estado final del esquema y se utiliza para inicializar
-- una base de datos completamente nueva. Las migraciones incrementales se aplican
-- sobre este esquema.

-- Instalar extensiones requeridas si no existen.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabla para almacenar administradores del sistema.
-- Los administradores pueden gestionar condominios, usuarios, etc.
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    can_create_admins BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para almacenar la configuración de cada administrador.
CREATE TABLE admin_settings (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(10) DEFAULT 'light' NOT NULL,
    language VARCHAR(5) DEFAULT 'es' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para almacenar sesiones de administradores activas.
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(token)
);
CREATE INDEX idx_sessions_admin_id ON sessions(admin_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);


-- Tabla para registrar las migraciones de esquema aplicadas.
-- Esto previene que una misma migración se ejecute múltiples veces.
CREATE TABLE schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    sql_script TEXT
);

-- Función reutilizable para actualizar el campo 'updated_at' en cualquier tabla.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para la tabla 'admins' que actualiza 'updated_at' en cada modificación.
CREATE TRIGGER update_admins_updated_at
BEFORE UPDATE ON admins
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger para la tabla 'admin_settings'
CREATE TRIGGER update_admin_settings_updated_at
BEFORE UPDATE ON admin_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- --- Datos Iniciales ---

-- Insertar el primer administrador con una contraseña hasheada (bcrypt).
-- La contraseña en texto plano es 'adminivan123'.
INSERT INTO admins (name, email, password_hash, can_create_admins) VALUES
('José Angel Iván Rubianes Silva', 'angelivan34@gmail.com', crypt('adminivan123', gen_salt('bf')), TRUE);

-- Registrar que el schema inicial ya incluye todas las migraciones hasta la 0004.
-- Esto asegura que, en una base de datos nueva, las migraciones incrementales
-- no intenten volver a aplicar cambios que ya están en este schema.
INSERT INTO schema_migrations (migration_name) VALUES
('0001_initial_schema.sql'),
('0002_add_admin_creation_permission.sql'),
('0003_add_updated_at_to_admins.sql'),
('0004_add_updated_at_trigger_to_admins.sql'),
('0005_hash_initial_admin_password.sql');
