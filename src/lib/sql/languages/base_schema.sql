CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS languages (
    id VARCHAR(10) PRIMARY KEY,
    name_translations JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON languages
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
