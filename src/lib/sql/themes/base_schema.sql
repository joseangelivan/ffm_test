-- src/lib/sql/themes/base_schema.sql
CREATE TABLE IF NOT EXISTS themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    background_hsl VARCHAR(255) NOT NULL,
    foreground_hsl VARCHAR(255) NOT NULL,
    card_hsl VARCHAR(255) NOT NULL,
    card_foreground_hsl VARCHAR(255) NOT NULL,
    popover_hsl VARCHAR(255) NOT NULL,
    popover_foreground_hsl VARCHAR(255) NOT NULL,
    primary_hsl VARCHAR(255) NOT NULL,
    primary_foreground_hsl VARCHAR(255) NOT NULL,
    secondary_hsl VARCHAR(255) NOT NULL,
    secondary_foreground_hsl VARCHAR(255) NOT NULL,
    muted_hsl VARCHAR(255) NOT NULL,
    muted_foreground_hsl VARCHAR(255) NOT NULL,
    accent_hsl VARCHAR(255) NOT NULL,
    accent_foreground_hsl VARCHAR(255) NOT NULL,
    destructive_hsl VARCHAR(255) NOT NULL,
    destructive_foreground_hsl VARCHAR(255) NOT NULL,
    border_hsl VARCHAR(255) NOT NULL,
    input_hsl VARCHAR(255) NOT NULL,
    ring_hsl VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para actualizar 'updated_at'
CREATE OR REPLACE TRIGGER set_timestamp
BEFORE UPDATE ON themes
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
