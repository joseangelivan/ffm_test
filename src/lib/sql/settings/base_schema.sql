-- Tabla para configuraciones generales de la aplicación
CREATE TABLE IF NOT EXISTS app_settings (
    id VARCHAR(255) PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para configuraciones de SMTP
CREATE TABLE IF NOT EXISTS smtp_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    secure BOOLEAN DEFAULT true,
    auth_user VARCHAR(255) NOT NULL,
    auth_pass TEXT NOT NULL, -- Should be encrypted in a real app
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para temas de la interfaz
CREATE TABLE IF NOT EXISTS themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
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

-- Tabla para configuraciones de los administradores
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(255) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'pt',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(admin_id)
);
