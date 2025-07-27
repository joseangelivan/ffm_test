CREATE TABLE IF NOT EXISTS condominios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to update 'updated_at' timestamp on any row update
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_condominios_updated_at'
        AND tgrelid = 'condominios'::regclass
    ) THEN
        CREATE TRIGGER set_condominios_updated_at
        BEFORE UPDATE ON condominios
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at_timestamp();
    END IF;
END
$$;

-- Insert test data only if the table is empty
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM condominios LIMIT 1) THEN
        INSERT INTO condominios (name, address) VALUES
        ('Residencial Jardins', 'Rua das Flores, 123, São Paulo, SP'),
        ('Condomínio Morada do Sol', 'Avenida Principal, 456, Rio de Janeiro, RJ');
    END IF;
END
$$;
