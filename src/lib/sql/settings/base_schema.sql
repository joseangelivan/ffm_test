
-- Main application settings (key-value store)
CREATE TABLE IF NOT EXISTS app_settings (
    id VARCHAR(255) PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom themes for the application
CREATE TABLE IF NOT EXISTS themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    
    background_hsl VARCHAR(50),
    foreground_hsl VARCHAR(50),
    card_hsl VARCHAR(50),
    card_foreground_hsl VARCHAR(50),
    popover_hsl VARCHAR(50),
    popover_foreground_hsl VARCHAR(50),
    primary_hsl VARCHAR(50),
    primary_foreground_hsl VARCHAR(50),
    secondary_hsl VARCHAR(50),
    secondary_foreground_hsl VARCHAR(50),
    muted_hsl VARCHAR(50),
    muted_foreground_hsl VARCHAR(50),
    accent_hsl VARCHAR(50),
    accent_foreground_hsl VARCHAR(50),
    destructive_hsl VARCHAR(50),
    destructive_foreground_hsl VARCHAR(50),
    border_hsl VARCHAR(50),
    input_hsl VARCHAR(50),
    ring_hsl VARCHAR(50),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
