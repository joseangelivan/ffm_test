-- Base schema for the entry control (gatekeeper) domain

CREATE TABLE IF NOT EXISTS gatekeepers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE RESTRICT,
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE RESTRICT,
    gatekeeper_id UUID NOT NULL REFERENCES gatekeepers(id) ON DELETE RESTRICT,
    access_type VARCHAR(50) NOT NULL, -- 'entry' or 'exit'
    access_time TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gatekeepers_condominium_id ON gatekeepers(condominium_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_condominium_id ON access_logs(condominium_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_resident_id ON access_logs(resident_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_gatekeeper_id ON access_logs(gatekeeper_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_access_time ON access_logs(access_time);
