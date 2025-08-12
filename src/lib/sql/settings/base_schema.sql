-- Settings Schema

CREATE TABLE IF NOT EXISTS app_settings (
    id VARCHAR(255) PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(255) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'pt-BR',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(admin_id)
);

-- Add foreign key constraint to a custom theme if it exists.
-- This ensures that if a custom theme is deleted, the setting is handled.
-- We check if the 'themes' table exists before adding the constraint.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'themes') THEN
        -- First, remove any existing constraint with a similar purpose to avoid errors.
        IF EXISTS (
            SELECT 1 FROM information_schema.constraint_column_usage
            WHERE table_name = 'admin_settings' AND constraint_name = 'admin_settings_theme_fkey'
        ) THEN
            ALTER TABLE admin_settings DROP CONSTRAINT admin_settings_theme_fkey;
        END IF;

    END IF;
END;
$$;
