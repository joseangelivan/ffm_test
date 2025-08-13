CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS admin_settings (
    admin_id UUID PRIMARY KEY,
    theme VARCHAR(255) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'pt-BR',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON admin_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
