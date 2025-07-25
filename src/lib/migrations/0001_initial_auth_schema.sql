-- Fase 1: Limpieza Radical de Tablas Obsoletas
-- Elimina todas las tablas que ya no forman parte del esquema final.
-- Usamos CASCADE para eliminar cualquier dependencia (vistas, claves foráneas, etc.).
DROP TABLE IF EXISTS "condominios" CASCADE;
DROP TABLE IF EXISTS "devices" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "geofences" CASCADE;
DROP TABLE IF EXISTS "map_elements" CASCADE;
DROP TABLE IF EXISTS "element_types" CASCADE;
DROP TABLE IF EXISTS "Usuarios" CASCADE;
DROP TABLE IF EXISTS "user_preferences" CASCADE;

-- Fase 2: Creación y Sincronización del Esquema Final
-- Asegura que las tablas requeridas por la aplicación existan con la estructura correcta.

-- Tabla de administradores
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para gestionar sesiones de administrador
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para configuraciones de la interfaz de administrador
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID UNIQUE NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'es',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Fase 3: Auditoría y Modificación de Columnas
-- Asegura que las tablas existentes tengan las columnas necesarias.
DO $$
BEGIN
    -- Añadir columna 'name' a 'admins' si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='name') THEN
        ALTER TABLE admins ADD COLUMN name VARCHAR(255);
    END IF;
    -- Añadir columna 'created_at' a 'admins' si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='created_at') THEN
        ALTER TABLE admins ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END;
$$;


-- Fase 4: Inserción de Datos Iniciales
-- Inserta el usuario administrador principal si no existe.
-- La contraseña se hashea usando el mismo algoritmo que bcrypt.
DO $$
DECLARE
    -- Genera un hash bcrypt para la contraseña 'adminivan123'
    hashed_password TEXT := crypt('adminivan123', gen_salt('bf'));
BEGIN
    INSERT INTO admins (name, email, password_hash) VALUES
    ('José Angel Iván Rubianes Silva', 'angelivan34@gmail.com', hashed_password)
    ON CONFLICT (email) DO NOTHING;
END;
$$;
