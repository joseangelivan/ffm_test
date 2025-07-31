
CREATE TABLE IF NOT EXISTS app_settings (
    id VARCHAR(255) PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_app_settings_updated_at' 
        AND tgrelid = 'app_settings'::regclass
    ) THEN
        CREATE TRIGGER update_app_settings_updated_at
        BEFORE UPDATE ON app_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS smtp_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    secure BOOLEAN NOT NULL DEFAULT true,
    auth_user VARCHAR(255) NOT NULL,
    auth_pass TEXT NOT NULL,
    priority INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_smtp_configurations_updated_at' 
        AND tgrelid = 'smtp_configurations'::regclass
    ) THEN
        CREATE TRIGGER update_smtp_configurations_updated_at
        BEFORE UPDATE ON smtp_configurations
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;
