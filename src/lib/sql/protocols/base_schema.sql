CREATE TABLE IF NOT EXISTS protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    features_translations JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_timestamp_protocols ON protocols;
CREATE TRIGGER set_timestamp_protocols
BEFORE UPDATE ON protocols
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
