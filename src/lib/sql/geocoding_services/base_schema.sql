CREATE TABLE IF NOT EXISTS geocoding_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    config_json JSONB NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure only one service can be default
CREATE UNIQUE INDEX IF NOT EXISTS geocoding_services_one_default_idx ON geocoding_services (is_default) WHERE is_default = true;

-- Trigger to update 'updated_at' column on row update
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_geocoding_services_timestamp') THEN
        CREATE TRIGGER set_geocoding_services_timestamp
        BEFORE UPDATE ON geocoding_services
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp();
    END IF;
END
$$;
