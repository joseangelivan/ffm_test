
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    device_type_id UUID NOT NULL REFERENCES device_types(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    token TEXT NOT NULL UNIQUE,
    last_location POINT,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_devices_updated_at
BEFORE UPDATE ON devices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Seed two example devices for the default test condominium
DO $$
DECLARE
    condo_id UUID;
    device_type_id_smart UUID;
BEGIN
    -- Get the ID of the default condominium
    SELECT id INTO condo_id FROM condominiums WHERE name = 'Condominio Paraíso' LIMIT 1;

    -- Get the ID of the 'Smartphone' device type
    SELECT id INTO device_type_id_smart FROM device_types WHERE name_translations->>'pt-BR' = 'Smartphone' LIMIT 1;

    -- Insert devices only if both IDs were found
    IF condo_id IS NOT NULL AND device_type_id_smart IS NOT NULL THEN
        INSERT INTO devices (name, condominium_id, device_type_id, token)
        VALUES 
            ('iPhone de Juan', condo_id, device_type_id_smart, 'token_iphone_juan_123'),
            ('Galaxy de Pedro', condo_id, device_type_id_smart, 'token_galaxy_pedro_456')
        ON CONFLICT (token) DO NOTHING;
    END IF;
END $$;

    