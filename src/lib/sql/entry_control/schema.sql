-- Base schema for the Entry Control system

-- Enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table for condominiums
CREATE TABLE IF NOT EXISTS condominiums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for gatekeepers (portería)
CREATE TABLE IF NOT EXISTS gatekeepers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for residents
CREATE TABLE IF NOT EXISTS residents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone_number VARCHAR(50),
    unit_number VARCHAR(50), -- e.g., 'Apt 101', 'House 15'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for access logs
CREATE TABLE IF NOT EXISTS access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE RESTRICT,
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    gatekeeper_id UUID NOT NULL REFERENCES gatekeepers(id) ON DELETE RESTRICT,
    direction VARCHAR(10) NOT NULL, -- 'entry' or 'exit'
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gatekeepers_email ON gatekeepers(email);
CREATE INDEX IF NOT EXISTS idx_gatekeepers_condominium_id ON gatekeepers(condominium_id);
CREATE INDEX IF NOT EXISTS idx_residents_email ON residents(email);
CREATE INDEX IF NOT EXISTS idx_residents_condominium_id ON residents(condominium_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_resident_id ON access_logs(resident_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_gatekeeper_id ON access_logs(gatekeeper_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON access_logs(timestamp);

    