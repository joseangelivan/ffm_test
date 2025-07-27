-- This schema is for gatekeepers (portería) and access control logs.

-- Create the gatekeepers table. They are linked to a specific condominium.
CREATE TABLE IF NOT EXISTS gatekeepers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the access logs table to track entries and exits.
CREATE TABLE IF NOT EXISTS access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE,
    resident_id UUID REFERENCES residents(id) ON DELETE SET NULL,
    gatekeeper_id UUID REFERENCES gatekeepers(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL, -- e.g., 'entry', 'exit'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
