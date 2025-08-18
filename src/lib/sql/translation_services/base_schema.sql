-- Tabla para almacenar configuraciones de servicios de traducción externos
CREATE TABLE IF NOT EXISTS translation_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    config_json JSONB NOT NULL,
    supported_languages JSONB,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para actualizar el campo updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.translation_services;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON translation_services
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
