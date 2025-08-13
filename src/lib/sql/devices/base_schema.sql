CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    resident_id UUID REFERENCES residents(id) ON DELETE SET NULL,
    device_type_id UUID REFERENCES device_types(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    token TEXT NOT NULL UNIQUE,
    last_location POINT,
    last_seen TIMESTAMPTZ,
    battery_level INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
