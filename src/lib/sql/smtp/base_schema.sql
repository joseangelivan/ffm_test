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


-- Table for SMTP configurations
CREATE TABLE IF NOT EXISTS smtp_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    secure BOOLEAN DEFAULT TRUE,
    auth_user VARCHAR(255) NOT NULL,
    auth_pass TEXT NOT NULL, -- Should be encrypted in a real app
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for smtp_configurations table
DROP TRIGGER IF EXISTS set_timestamp_smtp_configurations ON smtp_configurations;
CREATE TRIGGER set_timestamp_smtp_configurations
BEFORE UPDATE ON smtp_configurations
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();


    