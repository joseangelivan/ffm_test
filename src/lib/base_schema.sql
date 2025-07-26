-- This file defines the initial database schema, including tables for administrators,
-- condominiums, users, devices, and geofences. It is used as the starting point
-- for database migrations.

-- This extension is required for UUID generation.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Admins Table
-- Stores credentials for the administrators who manage condominiums.
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    condominio_id UUID,
    salt VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expires_at TIMESTAMPTZ
);


-- Condominios Table
-- Represents a condominium or residential complex managed by an admin.
CREATE TABLE condominios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    map_url TEXT, -- URL to an OpenStreetMap or similar map
    admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Foreign key from admins to condominios
-- An admin must be associated with a condominium.
ALTER TABLE admins
ADD CONSTRAINT fk_condominio
FOREIGN KEY (condominio_id)
REFERENCES condominios(id);


-- Users Table
-- Stores information about residents and staff in a condominium.
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('residente', 'porteria')),
    condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- Devices Table
-- Lists all trackable devices, associated with a user and condominium.
CREATE TABLE dispositivos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50),
    user_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Device Locator Table
-- Stores the real-time location data for each device.
CREATE TABLE localizador_dispositivos (
    id BIGSERIAL PRIMARY KEY,
    dispositivo_id UUID NOT NULL REFERENCES dispositivos(id) ON DELETE CASCADE,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- Geofences Table
-- Defines geographical boundaries within a condominium for alerts and monitoring.
CREATE TABLE geocercas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for improved query performance
CREATE INDEX idx_dispositivos_on_user_id ON dispositivos(user_id);
CREATE INDEX idx_dispositivos_on_condominio_id ON dispositivos(condominio_id);
CREATE INDEX idx_localizador_dispositivos_on_dispositivo_id ON localizador_dispositivos(dispositivo_id);
CREATE INDEX idx_usuarios_on_condominio_id ON usuarios(condominio_id);
CREATE INDEX idx_geocercas_on_condominio_id ON geocercas(condominio_id);
