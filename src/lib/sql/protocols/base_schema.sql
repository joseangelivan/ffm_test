-- src/lib/sql/protocols/base_schema.sql
CREATE TABLE IF NOT EXISTS protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    features_translations JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to update 'updated_at' timestamp on any column change
CREATE TRIGGER protocols_update_updated_at_task
BEFORE UPDATE ON protocols
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
