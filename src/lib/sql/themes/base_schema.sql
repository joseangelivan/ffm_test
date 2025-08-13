CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS themes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
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

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON themes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
