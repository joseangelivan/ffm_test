
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS access_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    code_type VARCHAR(50) NOT NULL, -- 'visitor', 'delivery', 'permanent'
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    max_uses INT,
    uses_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entry_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    gatekeeper_id UUID REFERENCES gatekeepers(id) ON DELETE SET NULL,
    access_code_id UUID REFERENCES access_codes(id) ON DELETE SET NULL,
    entry_type VARCHAR(50) NOT NULL, -- 'entry', 'exit'
    person_name VARCHAR(255),
    vehicle_plate VARCHAR(20),
    notes TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

    