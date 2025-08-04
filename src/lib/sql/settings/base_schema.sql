

CREATE TABLE IF NOT EXISTS app_settings (
    id VARCHAR(255) PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_settings (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(10) DEFAULT 'light',
    language VARCHAR(5) DEFAULT 'pt',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resident_settings (
    resident_id UUID PRIMARY KEY REFERENCES residents(id) ON DELETE CASCADE,
    theme VARCHAR(10) DEFAULT 'light',
    language VARCHAR(5) DEFAULT 'pt',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS smtp_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    secure BOOLEAN NOT NULL DEFAULT true,
    auth_user VARCHAR(255) NOT NULL,
    auth_pass TEXT NOT NULL, -- Should be encrypted in a real application
    priority INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creating an index for priority to speed up ordering
CREATE INDEX IF NOT EXISTS idx_smtp_priority ON smtp_configurations(priority);
