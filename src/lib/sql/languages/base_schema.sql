
CREATE TABLE IF NOT EXISTS languages (
    id VARCHAR(10) PRIMARY KEY, -- e.g., 'en', 'es', 'pt-BR'
    name_translations JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_update_languages_updated_at ON languages;
CREATE TRIGGER trigger_update_languages_updated_at
BEFORE UPDATE ON languages
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
