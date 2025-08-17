CREATE TABLE IF NOT EXISTS device_types (
    id SERIAL PRIMARY KEY,
    name_translations JSONB NOT NULL,
    features_translations JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_device_types_updated_at
BEFORE UPDATE ON device_types
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();


CREATE TABLE IF NOT EXISTS languages (
    id VARCHAR(10) PRIMARY KEY,
    name_translations JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_languages_updated_at
BEFORE UPDATE ON languages
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

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
