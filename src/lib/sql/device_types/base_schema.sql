-- Tabla para los tipos de dispositivos (catálogo)
CREATE TABLE IF NOT EXISTS device_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_translations JSONB NOT NULL,
    features_translations JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name_translations)
);

-- Trigger para actualizar el campo updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.device_types;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON device_types
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
