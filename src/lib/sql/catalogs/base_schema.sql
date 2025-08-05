
CREATE TABLE IF NOT EXISTS device_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS communication_protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default device types
INSERT INTO device_types (name, description) VALUES
('smartphone', 'Teléfono inteligente con GPS y capacidades de datos.'),
('watch', 'Reloj inteligente con GPS.'),
('esp32', 'Placa de desarrollo ESP32 para proyectos IoT.'),
('car_gps', 'Dispositivo de rastreo GPS para vehículos.'),
('asset_tracker', 'Rastreador de activos para contenedores, maquinaria, etc.'),
('pet_collar', 'Collar de rastreo para mascotas.')
ON CONFLICT (name) DO NOTHING;

-- Seed default communication protocols
INSERT INTO communication_protocols (name, description) VALUES
('http', 'Protocolo de Transferencia de Hipertexto (HTTP/HTTPS).'),
('websocket', 'Comunicación bidireccional en tiempo real sobre una única conexión TCP.'),
('mqtt', 'Protocolo ligero de mensajería para dispositivos restringidos.'),
('tcp', 'Protocolo de Control de Transmisión (Socket TCP).'),
('udp', 'Protocolo de Datagramas de Usuario (Socket UDP).')
ON CONFLICT (name) DO NOTHING;
