CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    device_type_id UUID NOT NULL REFERENCES device_types(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para actualizar el campo updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.devices;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON devices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- Datos de ejemplo
INSERT INTO devices (condominium_id, device_type_id, name, token)
SELECT 
    c.id, 
    dt.id, 
    'iPhone de Juan', 
    'a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8'
FROM 
    condominiums c, device_types dt 
WHERE 
    c.name = 'Condominio Paraíso' AND dt.name_translations->>'pt-BR' = 'Smartphone'
ON CONFLICT (token) DO NOTHING;

INSERT INTO devices (condominium_id, device_type_id, name, token)
SELECT 
    c.id, 
    dt.id, 
    'Galaxy de Pedro', 
    'b2c3d4e5-f6g7-8901-h2i3-j4k5l6m7n8o9'
FROM 
    condominiums c, device_types dt 
WHERE 
    c.name = 'Condominio Paraíso' AND dt.name_translations->>'pt-BR' = 'Smartphone'
ON CONFLICT (token) DO NOTHING;
