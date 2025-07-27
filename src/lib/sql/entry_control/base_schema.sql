-- Base schema for the entry control (gatekeeper) domain.
-- This file should only contain CREATE statements and should be non-destructive.

CREATE TABLE IF NOT EXISTS condominiums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gatekeepers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS residents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    housing_details TEXT, -- e.g., "Apt 101, Block B"
    email VARCHAR(255) UNIQUE,
    phone_number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE RESTRICT,
    gatekeeper_id UUID NOT NULL REFERENCES gatekeepers(id) ON DELETE RESTRICT,
    access_type VARCHAR(50) NOT NULL, -- e.g., 'entry', 'exit'
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_gatekeepers_condominium_id ON gatekeepers(condominium_id);
CREATE INDEX IF NOT EXISTS idx_residents_condominium_id ON residents(condominium_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_resident_id ON access_logs(resident_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_gatekeeper_id ON access_logs(gatekeeper_id);
