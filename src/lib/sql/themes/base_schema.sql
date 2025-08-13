CREATE TABLE IF NOT EXISTS themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    background_hsl TEXT NOT NULL,
    foreground_hsl TEXT NOT NULL,
    card_hsl TEXT NOT NULL,
    card_foreground_hsl TEXT NOT NULL,
    popover_hsl TEXT NOT NULL,
    popover_foreground_hsl TEXT NOT NULL,
    primary_hsl TEXT NOT NULL,
    primary_foreground_hsl TEXT NOT NULL,
    secondary_hsl TEXT NOT NULL,
    secondary_foreground_hsl TEXT NOT NULL,
    muted_hsl TEXT NOT NULL,
    muted_foreground_hsl TEXT NOT NULL,
    accent_hsl TEXT NOT NULL,
    accent_foreground_hsl TEXT NOT NULL,
    destructive_hsl TEXT NOT NULL,
    destructive_foreground_hsl TEXT NOT NULL,
    border_hsl TEXT NOT NULL,
    input_hsl TEXT NOT NULL,
    ring_hsl TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_themes_updated_at
BEFORE UPDATE ON themes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
