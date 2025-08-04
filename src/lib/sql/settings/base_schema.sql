
CREATE TABLE IF NOT EXISTS app_settings (
    id VARCHAR(255) PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION update_app_settings_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update the updated_at column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_app_settings_updated_at') THEN
        CREATE TRIGGER update_app_settings_updated_at
        BEFORE UPDATE ON app_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_app_settings_updated_at_column();
    END IF;
END
$$;

-- Insert default settings if they don't exist
INSERT INTO app_settings (id, value) VALUES ('default_theme_id', 'light') ON CONFLICT (id) DO NOTHING;


-- Themes Table
CREATE TABLE IF NOT EXISTS themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    is_default BOOLEAN DEFAULT FALSE,
    
    background_hsl VARCHAR(50) NOT NULL,
    foreground_hsl VARCHAR(50) NOT NULL,
    card_hsl VARCHAR(50) NOT NULL,
    card_foreground_hsl VARCHAR(50) NOT NULL,
    popover_hsl VARCHAR(50) NOT NULL,
    popover_foreground_hsl VARCHAR(50) NOT NULL,
    primary_hsl VARCHAR(50) NOT NULL,
    primary_foreground_hsl VARCHAR(50) NOT NULL,
    secondary_hsl VARCHAR(50) NOT NULL,
    secondary_foreground_hsl VARCHAR(50) NOT NULL,
    muted_hsl VARCHAR(50) NOT NULL,
    muted_foreground_hsl VARCHAR(50) NOT NULL,
    accent_hsl VARCHAR(50) NOT NULL,
    accent_foreground_hsl VARCHAR(50) NOT NULL,
    destructive_hsl VARCHAR(50) NOT NULL,
    destructive_foreground_hsl VARCHAR(50) NOT NULL,
    border_hsl VARCHAR(50) NOT NULL,
    input_hsl VARCHAR(50) NOT NULL,
    ring_hsl VARCHAR(50) NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE OR REPLACE FUNCTION update_themes_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_themes_updated_at') THEN
        CREATE TRIGGER update_themes_updated_at
        BEFORE UPDATE ON themes
        FOR EACH ROW
        EXECUTE FUNCTION update_themes_updated_at_column();
    END IF;
END
$$;

-- Constraint to ensure only one default theme
CREATE UNIQUE INDEX IF NOT EXISTS one_default_theme ON themes (is_default) WHERE is_default = TRUE;
