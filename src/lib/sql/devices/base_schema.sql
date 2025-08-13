
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    device_type_id UUID NOT NULL REFERENCES device_types(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    token TEXT NOT NULL UNIQUE,
    last_location POINT,
    last_seen_at TIMESTAMMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para actualizar el campo updated_at
CREATE TRIGGER set_devices_updated_at
BEFORE UPDATE ON devices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Datos de ejemplo
INSERT INTO devices (condominium_id, device_type_id, name, token)
SELECT
    (SELECT id FROM condominiums WHERE name = 'Condominio Paraíso'),
    (SELECT id FROM device_types WHERE name_translations->>'pt-BR' = 'Smartphone'),
    'iPhone de Juan',
    'a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8'
ON CONFLICT (token) DO NOTHING;

INSERT INTO devices (condominium_id, device_type_id, name, token)
SELECT
    (SELECT id FROM condominiums WHERE name = 'Condominio Paraíso'),
    (SELECT id FROM device_types WHERE name_translations->>'pt-BR' = 'Smartphone'),
    'Galaxy de Pedro',
    'b2c3d4e5-f6g7-8901-h2i3-j4k5l6m7n8o9'
ON CONFLICT (token) DO NOTHING;
