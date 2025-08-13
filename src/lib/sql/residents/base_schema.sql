
-- Residents Table
CREATE TABLE IF NOT EXISTS residents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    location VARCHAR(255), -- e.g., 'Block A', 'Tower 2'
    housing VARCHAR(255), -- e.g., 'Apt 101', 'House 25'
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_residents_condominium_id ON residents(condominium_id);
CREATE INDEX IF NOT EXISTS idx_residents_email ON residents(email);

-- Trigger to update 'updated_at' timestamp
CREATE OR REPLACE TRIGGER set_timestamp
BEFORE UPDATE ON residents
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
