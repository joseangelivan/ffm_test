-- Tabla para el catálogo de idiomas
CREATE TABLE IF NOT EXISTS languages (
    id VARCHAR(10) PRIMARY KEY,
    name_translations JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para actualizar el campo updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.languages;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON languages
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
