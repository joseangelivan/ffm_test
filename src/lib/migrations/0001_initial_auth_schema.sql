-- Create the main tables for authentication and core app structure

-- Admins table for administrators who manage the system
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table for admin authentication
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin settings table
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light' NOT NULL,
    language VARCHAR(10) DEFAULT 'es' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for storing IoT and mobile devices
CREATE TABLE IF NOT EXISTS dispositivos (
    id_dispositivo SERIAL PRIMARY KEY,
    nombre_dispositivo VARCHAR(100) NOT NULL,
    tipo_dispositivo VARCHAR(50),
    id_usuario INT, -- Foreign key to the users table
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for users, could be residents, security personnel, etc.
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre_usuario VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    rol VARCHAR(50),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to track the location of devices
CREATE TABLE IF NOT EXISTS localizador_dispositivos (
    id_localizador SERIAL PRIMARY KEY,
    id_dispositivo INT REFERENCES dispositivos(id_dispositivo),
    latitud DECIMAL(9,6),
    longitud DECIMAL(9,6),
    fecha_hora_lectura TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
