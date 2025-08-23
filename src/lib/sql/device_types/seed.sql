-- src/lib/sql/device_types/seed.sql

INSERT INTO device_types (name_translations) VALUES 
('{"es": "Teléfono Inteligente", "pt-BR": "Smartphone"}')
ON CONFLICT ((name_translations->>'es'), (name_translations->>'pt-BR')) DO NOTHING;
