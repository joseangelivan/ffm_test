-- PostgreSQL schema for Follow For Me App

-- Extension for generating UUIDs

-- Condominios Table
-- Represents each condominium or residential complex managed in the app.
CREATE TABLE condominios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Types Enum
-- Defines the possible roles for a user within a condominium.
CREATE TYPE user_type AS ENUM ('Residente', 'Portería');

-- Usuarios Table
-- Stores information about residents and gatekeepers.
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    type user_type NOT NULL,
    condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    avatar_url VARCHAR(255),
    -- Additional, optional user details
    location TEXT, -- e.g., 'Torre A, Sección 2'
    housing TEXT, -- e.g., 'Apto 101'
    phone VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Device Types Enum
-- Defines the types of devices that can be tracked.
CREATE TYPE device_type AS ENUM ('smartphone', 'watch', 'laptop', 'car', 'esp32', 'other');

-- Dispositivos Table
-- Stores trackable devices, linked to a user and a condominium.
CREATE TABLE dispositivos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type device_type NOT NULL,
    token TEXT UNIQUE NOT NULL, -- Authentication token for the device
    condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL, -- A device can be unassigned
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Device Status Enum
CREATE TYPE device_status AS ENUM ('Online', 'Offline');

-- Localizacion_Dispositivos Table
-- Stores the real-time (or last known) location of each device.
CREATE TABLE localizacion_dispositivos (
    id BIGSERIAL PRIMARY KEY,
    dispositivo_id UUID NOT NULL REFERENCES dispositivos(id) ON DELETE CASCADE,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    battery_level INTEGER, -- Battery percentage (0-100)
    status device_status NOT NULL DEFAULT 'Offline',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_usuarios_condominio_id ON usuarios(condominio_id);
CREATE INDEX idx_dispositivos_condominio_id ON dispositivos(condominio_id);
CREATE INDEX idx_dispositivos_usuario_id ON dispositivos(usuario_id);
CREATE INDEX idx_localizacion_dispositivo_id_timestamp ON localizacion_dispositivos(dispositivo_id, timestamp DESC);

-- Function to update the 'updated_at' column automatically
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update 'updated_at' on row modification
CREATE TRIGGER set_timestamp_usuarios
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_dispositivos
BEFORE UPDATE ON dispositivos
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- You can now populate these tables with some initial data.
-- Example:
-- INSERT INTO admins (name, email, password_hash) VALUES ('Admin Geral', 'admin@followforme.com', 'some_strong_hash');
-- Inserción del administrador inicial
-- La contraseña debe ser hasheada de forma segura en una aplicación real.
-- Aquí usamos la contraseña en texto plano como placeholder temporal.
-- En un entorno real, se generaría el hash con una librería como bcrypt.
INSERT INTO admins (name, email, password_hash) VALUES
('José Angel Iván Rubianes Silva', 'angelivan34@gmail.com', 'adminivan123');
