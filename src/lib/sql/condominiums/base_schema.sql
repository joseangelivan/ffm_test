-- Function to automatically update the 'updated_at' timestamp if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   pg_proc
        WHERE  proname = 'trigger_set_timestamp'
    ) THEN
        CREATE FUNCTION trigger_set_timestamp()
        RETURNS TRIGGER AS $func$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END;
$$;


-- Table for condominiums
CREATE TABLE IF NOT EXISTS condominiums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    continent VARCHAR(255),
    country VARCHAR(255),
    state VARCHAR(255),
    city VARCHAR(255),
    street VARCHAR(255),
    number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for condominiums table
DROP TRIGGER IF EXISTS set_timestamp_condominiums ON condominiums;
CREATE TRIGGER set_timestamp_condominiums
BEFORE UPDATE ON condominiums
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Table for residents
CREATE TABLE IF NOT EXISTS residents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for residents table
DROP TRIGGER IF EXISTS set_timestamp_residents ON residents;
CREATE TRIGGER set_timestamp_residents
BEFORE UPDATE ON residents
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();


-- Table for gatekeepers
CREATE TABLE IF NOT EXISTS gatekeepers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for gatekeepers table
DROP TRIGGER IF EXISTS set_timestamp_gatekeepers ON gatekeepers;
CREATE TRIGGER set_timestamp_gatekeepers
BEFORE UPDATE ON gatekeepers
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

    