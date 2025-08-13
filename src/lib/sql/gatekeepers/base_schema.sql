
-- Gatekeepers Table
CREATE TABLE IF NOT EXISTS gatekeepers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    location VARCHAR(255), -- e.g., 'Main Gate', 'Service Gate'
    housing VARCHAR(255), -- e.g., 'Gatehouse 1'
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_gatekeepers_condominium_id ON gatekeepers(condominium_id);
CREATE INDEX IF NOT EXISTS idx_gatekeepers_email ON gatekeepers(email);

-- Trigger to update 'updated_at' timestamp
CREATE OR REPLACE TRIGGER set_timestamp
BEFORE UPDATE ON gatekeepers
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
