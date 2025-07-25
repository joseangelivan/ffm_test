
-- Eliminar tablas obsoletas que no existen en el nuevo esquema
DROP TABLE IF EXISTS localizador_dispositivos;
DROP TABLE IF EXISTS dispositivos;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS geocercas;
DROP TABLE IF EXISTS condominios;

-- Modificar la tabla admins para eliminar columnas innecesarias
ALTER TABLE admins DROP COLUMN IF EXISTS created_at;
ALTER TABLE admins DROP COLUMN IF EXISTS updated_at;

-- Modificar la tabla admin_settings para añadir las nuevas columnas
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS theme VARCHAR(255) DEFAULT 'light';
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS language VARCHAR(255) DEFAULT 'es';
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Crear las nuevas tablas del esquema

CREATE TABLE IF NOT EXISTS condominios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_type VARCHAR(50) NOT NULL, -- 'Residente', 'Portería'
    location_info TEXT, -- e.g., 'Torre A, Sección 2'
    housing_info TEXT, -- e.g., 'Apto 101'
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Can be unassigned
    name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50), -- 'esp32', 'watch', 'smartphone', etc.
    token TEXT UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'Offline',
    last_location POINT,
    battery_level INTEGER,
    created_at TIMESTAMTz DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    geometry JSONB NOT NULL, -- To store polygon, rectangle, or circle data
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
