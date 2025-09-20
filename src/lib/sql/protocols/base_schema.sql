
CREATE TABLE IF NOT EXISTS protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    features_translations JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_update_protocols_updated_at ON protocols;
CREATE TRIGGER trigger_update_protocols_updated_at
BEFORE UPDATE ON protocols
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
