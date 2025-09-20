-- Seed data for device_types table
INSERT INTO device_types (name_translations, features_translations) VALUES
('{"es": "Teléfono Inteligente", "pt-BR": "Smartphone"}', NULL),
('{"es": "Reloj", "pt-BR": "Relógio"}', NULL),
('{"es": "Portátil", "pt-BR": "Laptop"}', NULL),
('{"es": "Coche", "pt-BR": "Carro"}', NULL),
('{"es": "Dispositivo ESP32/IoT", "pt-BR": "Dispositivo ESP32/IoT"}', NULL),
('{"es": "Otro", "pt-BR": "Outro"}', NULL)
ON CONFLICT (name_translations) DO NOTHING;
