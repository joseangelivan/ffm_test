
-- Base schema for the condominiums table
CREATE TABLE IF NOT EXISTS condominiums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    continent VARCHAR(255),
    country VARCHAR(255),
    state VARCHAR(255),
    city VARCHAR(255),
    street VARCHAR(255),
    number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to update 'updated_at' timestamp on any column change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'condominiums_updated_at_trigger') THEN
        CREATE TRIGGER condominiums_updated_at_trigger
        BEFORE UPDATE ON condominiums
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- Insert a test condominium for demonstration purposes.
-- This will only be inserted if the table is empty.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM condominiums) THEN
        INSERT INTO condominiums (name, continent, country, state, city, street, number) VALUES 
        ('Condomínio de Teste', 'Americas', 'Brazil', 'Sao Paulo', 'Sao Paulo', 'Av. Paulista', '1000');
    END IF;
END
$$;

-- Additional tables for residents, gatekeepers, devices, etc. with relations to condominiums.

CREATE TABLE IF NOT EXISTS residents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    apartment_number VARCHAR(50),
    block VARCHAR(50),
    phone_number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gatekeepers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE,
    resident_id UUID REFERENCES residents(id) ON DELETE SET NULL, -- Device can exist without a resident
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100), -- e.g., 'smartphone', 'watch', 'esp32'
    device_token TEXT NOT NULL UNIQUE, -- Hashed or unique token for device auth
    status VARCHAR(50) DEFAULT 'offline',
    last_seen TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    can_create_admins BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM admins WHERE email = 'admin@follow.me') THEN
        INSERT INTO admins (name, email, password_hash, can_create_admins) VALUES 
        ('Super Admin', 'admin@follow.me', '$2b$10$fVcGz7bF.z2r9V8h.FLzPO.8CjM0iBqj.1K6cK.jG.gY8z7bF.z2r', TRUE);
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_type VARCHAR(50) NOT NULL, -- 'admin', 'resident', 'gatekeeper'
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, user_type)
);

-- Settings tables for each user type
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

CREATE TABLE IF NOT EXISTS gatekeeper_settings (
    gatekeeper_id UUID PRIMARY KEY REFERENCES gatekeepers(id) ON DELETE CASCADE,
    theme VARCHAR(10) DEFAULT 'light',
    language VARCHAR(5) DEFAULT 'pt',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Triggers for all tables with updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'residents_updated_at_trigger') THEN
        CREATE TRIGGER residents_updated_at_trigger BEFORE UPDATE ON residents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'gatekeepers_updated_at_trigger') THEN
        CREATE TRIGGER gatekeepers_updated_at_trigger BEFORE UPDATE ON gatekeepers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'devices_updated_at_trigger') THEN
        CREATE TRIGGER devices_updated_at_trigger BEFORE UPDATE ON devices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'admins_updated_at_trigger') THEN
        CREATE TRIGGER admins_updated_at_trigger BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'admin_settings_updated_at_trigger') THEN
        CREATE TRIGGER admin_settings_updated_at_trigger BEFORE UPDATE ON admin_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'resident_settings_updated_at_trigger') THEN
        CREATE TRIGGER resident_settings_updated_at_trigger BEFORE UPDATE ON resident_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'gatekeeper_settings_updated_at_trigger') THEN
        CREATE TRIGGER gatekeeper_settings_updated_at_trigger BEFORE UPDATE ON gatekeeper_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;
