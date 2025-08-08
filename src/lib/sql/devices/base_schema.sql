-- src/lib/sql/devices/base_schema.sql

-- Make the creation of the ENUM type idempotent
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'device_type') THEN
        CREATE TYPE "device_type" AS ENUM (
            'smartphone',
            'watch',
            'car',
            'laptop',
            'esp32',
            'other'
        );
    END IF;
END$$;


CREATE TABLE IF NOT EXISTS "devices" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "condominium_id" UUID NOT NULL REFERENCES "condominiums"("id") ON DELETE CASCADE,
    "resident_id" UUID REFERENCES "residents"("id") ON DELETE SET NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" device_type NOT NULL,
    "token" VARCHAR(255) UNIQUE,
    "last_seen_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_devices_condominium_id" ON "devices"("condominium_id");
CREATE INDEX IF NOT EXISTS "idx_devices_resident_id" ON "devices"("resident_id");

-- Function to set updated_at on update
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_devices_updated_at') THEN
        CREATE TRIGGER set_devices_updated_at
        BEFORE UPDATE ON "devices"
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at_timestamp();
    END IF;
END$$;
