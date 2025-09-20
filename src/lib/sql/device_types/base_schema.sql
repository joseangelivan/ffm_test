
CREATE TABLE IF NOT EXISTS device_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_translations JSONB NOT NULL,
    features_translations JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_update_device_types_updated_at ON device_types;
CREATE TRIGGER trigger_update_device_types_updated_at
BEFORE UPDATE ON device_types
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
