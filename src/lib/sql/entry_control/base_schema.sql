CREATE TABLE IF NOT EXISTS entry_control (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    resident_id UUID REFERENCES residents(id) ON DELETE SET NULL,
    gatekeeper_id UUID REFERENCES gatekeepers(id) ON DELETE SET NULL,
    device_id UUID, -- Assuming a devices table might exist later
    entry_type VARCHAR(50) NOT NULL, -- 'entry' or 'exit'
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);
