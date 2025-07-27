-- Base schema for the Entry Control (Porteria) domain

-- Table to store condominiums
CREATE TABLE IF NOT EXISTS condominiums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for Gatekeepers (Porteria users)
CREATE TABLE IF NOT EXISTS gatekeepers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for Residents
CREATE TABLE IF NOT EXISTS residents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    unit_number VARCHAR(50), -- e.g., 'Apt 101', 'House 15'
    id_document VARCHAR(100), -- e.g., DNI, RG
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for Access Logs
CREATE TABLE IF NOT EXISTS access_logs (
    id BIGSERIAL PRIMARY KEY,
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    gatekeeper_id UUID NOT NULL REFERENCES gatekeepers(id),
    resident_id UUID REFERENCES residents(id), -- Can be NULL for visitors
    person_name VARCHAR(255) NOT NULL, -- Could be a visitor's name
    person_id_document VARCHAR(100),
    access_type VARCHAR(10) NOT NULL CHECK (access_type IN ('entry', 'exit')), -- 'entry' or 'exit'
    access_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Create indexes for foreign keys and frequently queried columns
CREATE INDEX IF NOT EXISTS idx_gatekeepers_condominium_id ON gatekeepers(condominium_id);
CREATE INDEX IF NOT EXISTS idx_residents_condominium_id ON residents(condominium_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_condominium_id ON access_logs(condominium_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_gatekeeper_id ON access_logs(gatekeeper_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_resident_id ON access_logs(resident_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_access_at ON access_logs(access_at);
