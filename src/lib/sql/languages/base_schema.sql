CREATE TABLE IF NOT EXISTS languages (
    id VARCHAR(10) PRIMARY KEY,
    name_translations JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_timestamp_languages ON languages;
CREATE TRIGGER set_timestamp_languages
BEFORE UPDATE ON languages
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
