
-- This is the initial, consolidated schema for the entire application.
-- It sets up all tables, functions, and initial data required for the app to start.

-- ==== FUNCTIONS ====
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';


-- ==== TABLES ====

-- System Tables
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    user_type VARCHAR(20) NOT NULL, -- 'admin', 'resident', 'gatekeeper'
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sessions_user_id_type_idx ON sessions (user_id, user_type);


-- Catalog Tables
CREATE TABLE IF NOT EXISTS device_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_translations JSONB NOT NULL,
    features_translations JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_device_types_timestamp
BEFORE UPDATE ON device_types
FOR EACH ROW
EXECUTE PROCEDURE update_timestamp();

INSERT INTO device_types (name_translations) VALUES ('{ "es": "Teléfono Inteligente", "pt-BR": "Smartphone" }') ON CONFLICT (id) DO NOTHING;


CREATE TABLE IF NOT EXISTS languages (
    id VARCHAR(10) PRIMARY KEY,
    name_translations JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_languages_timestamp
BEFORE UPDATE ON languages
FOR EACH ROW
EXECUTE PROCEDURE update_timestamp();

-- Seed Default Languages
INSERT INTO languages (id, name_translations) VALUES ('en', '{"es": "Inglés", "pt-BR": "Inglês"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('es', '{"es": "Español", "pt-BR": "Espanhol"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('fr', '{"es": "Francés", "pt-BR": "Francês"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('de', '{"es": "Alemán", "pt-BR": "Alemão"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('it', '{"es": "Italiano", "pt-BR": "Italiano"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('pt', '{"es": "Portugués", "pt-BR": "Português"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('pt-BR', '{"es": "Portugués (Brasil)", "pt-BR": "Português (Brasil)"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('ru', '{"es": "Ruso", "pt-BR": "Russo"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('zh', '{"es": "Chino", "pt-BR": "Chinês"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('ja', '{"es": "Japonés", "pt-BR": "Japonês"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('ko', '{"es": "Coreano", "pt-BR": "Coreano"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('ar', '{"es": "Árabe", "pt-BR": "Árabe"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('hi', '{"es": "Hindi", "pt-BR": "Híndi"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('bn', '{"es": "Bengalí", "pt-BR": "Bengali"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('nl', '{"es": "Holandés", "pt-BR": "Holandês"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('sv', '{"es": "Sueco", "pt-BR": "Sueco"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('fi', '{"es": "Finlandés", "pt-BR": "Finlandês"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('da', '{"es": "Danés", "pt-BR": "Dinamarquês"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('pl', '{"es": "Polaco", "pt-BR": "Polonês"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('uk', '{"es": "Ucraniano", "pt-BR": "Ucraniano"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('tr', '{"es": "Turco", "pt-BR": "Turco"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('el', '{"es": "Griego", "pt-BR": "Grego"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('he', '{"es": "Hebreo", "pt-BR": "Hebraico"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('th', '{"es": "Tailandés", "pt-BR": "Tailandês"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('vi', '{"es": "Vietnamita", "pt-BR": "Vietnamita"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('cs', '{"es": "Checo", "pt-BR": "Tcheco"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('hu', '{"es": "Húngaro", "pt-BR": "Húngaro"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('ro', '{"es": "Rumano", "pt-BR": "Romeno"}') ON CONFLICT (id) DO NOTHING;
INSERT INTO languages (id, name_translations) VALUES ('id', '{"es": "Indonesio", "pt-BR": "Indonésio"}') ON CONFLICT (id) DO NOTHING;

-- Themes Table
CREATE TABLE IF NOT EXISTS themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_themes_timestamp
BEFORE UPDATE ON themes
FOR EACH ROW
EXECUTE PROCEDURE update_timestamp();


-- Admins Table
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT,
    can_create_admins BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_admins_timestamp
BEFORE UPDATE ON admins
FOR EACH ROW
EXECUTE PROCEDURE update_timestamp();

CREATE TABLE IF NOT EXISTS admin_first_login_pins (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    pin_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_verification_pins (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    pin TEXT NOT NULL,
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_totp_secrets (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    secret TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Initial Admin User
INSERT INTO admins (name, email, password_hash, can_create_admins)
VALUES ('José Angel Iván Rubianes Silva', 'angelivan34@gmail.com', crypt('adminivan123', gen_salt('bf')), TRUE)
ON CONFLICT (email) DO NOTHING;


-- App Settings
CREATE TABLE IF NOT EXISTS app_settings (
    id VARCHAR(50) PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_app_settings_timestamp
BEFORE UPDATE ON app_settings
FOR EACH ROW
EXECUTE PROCEDURE update_timestamp();

CREATE TABLE IF NOT EXISTS admin_settings (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'pt-BR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_admin_settings_timestamp
BEFORE UPDATE ON admin_settings
FOR EACH ROW
EXECUTE PROCEDURE update_timestamp();


-- SMTP
CREATE TABLE IF NOT EXISTS smtp_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    secure BOOLEAN NOT NULL DEFAULT TRUE,
    auth_user VARCHAR(255) NOT NULL,
    auth_pass TEXT NOT NULL,
    priority INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_smtp_configurations_timestamp
BEFORE UPDATE ON smtp_configurations
FOR EACH ROW
EXECUTE PROCEDURE update_timestamp();


-- Condominiums
CREATE TABLE IF NOT EXISTS condominiums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    address TEXT,
    continent VARCHAR(50),
    country VARCHAR(100),
    state VARCHAR(100),
    city VARCHAR(100),
    street VARCHAR(255),
    number VARCHAR(50),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_condominiums_timestamp
BEFORE UPDATE ON condominiums
FOR EACH ROW
EXECUTE PROCEDURE update_timestamp();

-- Seed Test Condominium
INSERT INTO condominiums (name, address, continent, country, state, city, street, number) 
VALUES ('Condominio Paraíso', 'Av. del Edén 123, Jardines, Ciudad Capital, Capital', 'Americas', 'Brazil', 'Sao Paulo', 'Sao Paulo', 'Av. del Edén', '123') 
ON CONFLICT (name) DO NOTHING;


-- Residents
CREATE TABLE IF NOT EXISTS residents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    location TEXT, -- e.g., 'Tower A'
    housing TEXT, -- e.g., 'Apt 101'
    phone VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_residents_timestamp
BEFORE UPDATE ON residents
FOR EACH ROW
EXECUTE PROCEDURE update_timestamp();

-- Seed Test Resident
INSERT INTO residents (condominium_id, name, email, password_hash, location, housing, phone)
SELECT id, 'Juan Pérez', 'juan.perez@email.com', crypt('password123', gen_salt('bf')), 'Torre A', 'Apto 101', '+5511987654321'
FROM condominiums WHERE name = 'Condominio Paraíso'
ON CONFLICT (email) DO NOTHING;


-- Gatekeepers
CREATE TABLE IF NOT EXISTS gatekeepers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    location TEXT, -- e.g., 'Main Gate'
    housing TEXT,
    phone VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_gatekeepers_timestamp
BEFORE UPDATE ON gatekeepers
FOR EACH ROW
EXECUTE PROCEDURE update_timestamp();

-- Seed Test Gatekeeper
INSERT INTO gatekeepers (condominium_id, name, email, password_hash, location, housing, phone)
SELECT id, 'Pedro arias', 'pedro.arias@email.com', crypt('portero123', gen_salt('bf')), 'portaria 1', 'portaria 1', '+5511987654321'
FROM condominiums WHERE name = 'Condominio Paraíso'
ON CONFLICT (email) DO NOTHING;


-- Devices
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    device_type_id UUID REFERENCES device_types(id),
    condominium_id UUID REFERENCES condominiums(id) ON DELETE SET NULL,
    resident_id UUID REFERENCES residents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_devices_timestamp
BEFORE UPDATE ON devices
FOR EACH ROW
EXECUTE PROCEDURE update_timestamp();


-- Maps & Geofencing
CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    geometry JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_geofences_timestamp
BEFORE UPDATE ON geofences
FOR EACH ROW
EXECUTE PROCEDURE update_timestamp();

CREATE TABLE IF NOT EXISTS map_element_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    icon_svg TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_map_element_types_timestamp
BEFORE UPDATE ON map_element_types
FOR EACH ROW
EXECUTE PROCEDURE update_timestamp();


-- Translation Services
CREATE TABLE IF NOT EXISTS translation_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    config_json JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    supported_languages JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_translation_services_timestamp
BEFORE UPDATE ON translation_services
FOR EACH ROW
EXECUTE PROCEDURE update_timestamp();

