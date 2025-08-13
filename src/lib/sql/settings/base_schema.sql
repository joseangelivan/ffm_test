CREATE TABLE IF NOT EXISTS app_settings (
    id VARCHAR(255) PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_settings (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(255) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'pt-BR',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
