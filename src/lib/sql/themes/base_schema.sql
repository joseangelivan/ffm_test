-- Themes Schema

CREATE TABLE IF NOT EXISTS themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
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
