
CREATE TABLE IF NOT EXISTS device_types (
    id SERIAL PRIMARY KEY,
    name_translations JSONB NOT NULL,
    features_translations JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS communication_protocols (
    id SERIAL PRIMARY KEY,
    name_translations JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial device types
INSERT INTO device_types (name_translations, features_translations) VALUES
('{"es": "Teléfono Inteligente", "pt": "Smartphone"}', '{"es": "Dispositivo móvil con GPS y conectividad celular.", "pt": "Dispositivo móvel com GPS e conectividade celular."}'),
('{"es": "Reloj Inteligente", "pt": "Relógio Inteligente"}', '{"es": "Dispositivo de pulsera con seguimiento de ubicación.", "pt": "Dispositivo de pulso com rastreamento de localização."}'),
('{"es": "Dispositivo IoT (ESP32)", "pt": "Dispositivo IoT (ESP32)"}', '{"es": "Placa de desarrollo con Wi-Fi y Bluetooth.", "pt": "Placa de desenvolvimento com Wi-Fi e Bluetooth."}'),
('{"es": "Vehículo", "pt": "Veículo"}', '{"es": "Rastreador GPS instalado en un coche o motocicleta.", "pt": "Rastreador GPS instalado em um carro ou motocicleta."}')
ON CONFLICT DO NOTHING;

-- Seed initial communication protocols
INSERT INTO communication_protocols (name_translations) VALUES
('{"es": "WebSocket", "pt": "WebSocket"}'),
('{"es": "MQTT", "pt": "MQTT"}'),
('{"es": "HTTP", "pt": "HTTP"}'),
('{"es": "TCP", "pt": "TCP"}'),
('{"es": "UDP", "pt": "UDP"}')
ON CONFLICT DO NOTHING;
