-- Seed para device_types
INSERT INTO device_types (name_translations, features_translations) VALUES
('{"es": "Teléfono Inteligente", "pt-BR": "Smartphone"}', '{"es": "Dispositivo móvil con GPS y conexión de datos.", "pt-BR": "Dispositivo móvel com GPS e conexão de dados."}'),
('{"es": "Reloj Inteligente", "pt-BR": "Smartwatch"}', '{"es": "Dispositivo de pulsera con GPS.", "pt-BR": "Dispositivo de pulso com GPS."}'),
('{"es": "Portátil", "pt-BR": "Laptop"}', '{"es": "Computadora portátil con capacidades de seguimiento.", "pt-BR": "Computador portátil com capacidades de rastreamento."}'),
('{"es": "Coche", "pt-BR": "Carro"}', '{"es": "Vehículo con un rastreador GPS instalado.", "pt-BR": "Veículo com um rastreador GPS instalado."}'),
('{"es": "Dispositivo ESP32/IoT", "pt-BR": "Dispositivo ESP32/IoT"}', '{"es": "Hardware personalizado basado en ESP32 para seguimiento.", "pt-BR": "Hardware personalizado baseado em ESP32 para rastreamento."}'),
('{"es": "Otro", "pt-BR": "Outro"}', '{"es": "Cualquier otro tipo de dispositivo rastreable.", "pt-BR": "Qualquer outro tipo de dispositivo rastreável."}')
ON CONFLICT DO NOTHING;

-- Seed para languages
INSERT INTO languages (id, name_translations) VALUES
('en', '{"es": "Inglés", "pt-BR": "Inglês"}'),
('es', '{"es": "Español", "pt-BR": "Espanhol"}'),
('fr', '{"es": "Francés", "pt-BR": "Francês"}'),
('de', '{"es": "Alemán", "pt-BR": "Alemão"}'),
('it', '{"es": "Italiano", "pt-BR": "Italiano"}'),
('pt', '{"es": "Portugués", "pt-BR": "Português"}'),
('pt-BR', '{"es": "Portugués (Brasil)", "pt-BR": "Português (Brasil)"}'),
('ru', '{"es": "Ruso", "pt-BR": "Russo"}'),
('zh', '{"es": "Chino", "pt-BR": "Chinês"}'),
('ja', '{"es": "Japonés", "pt-BR": "Japonês"}'),
('ko', '{"es": "Coreano", "pt-BR": "Coreano"}'),
('ar', '{"es": "Árabe", "pt-BR": "Árabe"}'),
('hi', '{"es": "Hindi", "pt-BR": "Híndi"}'),
('bn', '{"es": "Bengalí", "pt-BR": "Bengali"}'),
('nl', '{"es": "Holandés", "pt-BR": "Holandês"}'),
('sv', '{"es": "Sueco", "pt-BR": "Sueco"}'),
('fi', '{"es": "Finlandés", "pt-BR": "Finlandês"}'),
('da', '{"es": "Danés", "pt-BR": "Dinamarquês"}'),
('pl', '{"es": "Polaco", "pt-BR": "Polonês"}'),
('uk', '{"es": "Ucraniano", "pt-BR": "Ucraniano"}'),
('tr', '{"es": "Turco", "pt-BR": "Turco"}'),
('el', '{"es": "Griego", "pt-BR": "Grego"}'),
('he', '{"es": "Hebreo", "pt-BR": "Hebraico"}'),
('th', '{"es": "Tailandés", "pt-BR": "Tailandês"}'),
('vi', '{"es": "Vietnamita", "pt-BR": "Vietnamita"}'),
('cs', '{"es": "Checo", "pt-BR": "Tcheco"}'),
('hu', '{"es": "Húngaro", "pt-BR": "Húngaro"}'),
('ro', '{"es": "Rumano", "pt-BR": "Romeno"}'),
('id', '{"es": "Indonesio", "pt-BR": "Indonésio"}')
ON CONFLICT (id) DO NOTHING;

-- Seed para protocols
INSERT INTO protocols (name) VALUES
('TCP'),
('UDP'),
('HTTP'),
('MQTT')
ON CONFLICT (name) DO NOTHING;

    