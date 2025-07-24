-- Tabla para los administradores principales de la plataforma
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para los condominios gestionados
CREATE TABLE condominios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    location_lat DECIMAL(9, 6),
    location_lng DECIMAL(9, 6),
    admin_id UUID REFERENCES admins(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tipos de usuario permitidos dentro de un condominio
CREATE TYPE user_role AS ENUM ('residente', 'porteria');

-- Tabla para usuarios (residentes y personal de portería)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    location_info VARCHAR(255), -- "Torre A, Sección 2"
    housing_info VARCHAR(255),  -- "Apto 101"
    phone VARCHAR(50),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(condominio_id, email)
);

-- Tipos de dispositivos de seguimiento
CREATE TYPE device_type AS ENUM ('smartphone', 'watch', 'laptop', 'car', 'esp32', 'other');

-- Tabla para los dispositivos de seguimiento
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type device_type NOT NULL,
    token TEXT UNIQUE NOT NULL, -- Token de autenticación para el dispositivo
    condominio_id UUID REFERENCES condominios(id) ON DELETE SET NULL, -- Dispositivos de un condominio
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Dispositivos personales de un usuario
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para la información de estado y ubicación en tiempo real de los dispositivos
CREATE TABLE device_status (
    id BIGSERIAL PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    location_lat DECIMAL(9, 6) NOT NULL,
    location_lng DECIMAL(9, 6) NOT NULL,
    battery_level INT,
    status VARCHAR(50) DEFAULT 'offline', -- "online", "offline"
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Tipos de formas para geocercas
CREATE TYPE geofence_shape_type AS ENUM ('polygon', 'rectangle', 'circle');

-- Tabla para las geocercas de cada condominio
CREATE TABLE geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    shape_type geofence_shape_type NOT NULL,
    geometry JSONB NOT NULL, -- Almacenar puntos, centro/radio, etc. como JSON
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMTz DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para los elementos del mapa (cámaras, porterías, etc.)
CREATE TABLE map_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- "camera", "gatehouse", etc.
    icon_url TEXT,
    location_lat DECIMAL(9, 6) NOT NULL,
    location_lng DECIMAL(9, 6) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Inserción del administrador inicial
-- La contraseña debe ser hasheada de forma segura en una aplicación real.
-- Aquí usamos un placeholder para el hash. En un entorno real,
-- se generaría con una librería como bcrypt. Por ejemplo, un hash para 'adminivan123'
-- podría ser algo como: '$2b$10$f/p.g./J9.E/1z2E3h4I5O.U6r7t8y9u0v1w2x3y4z5a6b7c8d9e'
INSERT INTO admins (name, email, password_hash) VALUES
('Angel Ivan', 'angelivan34@gmail.com', 'adminivan123'); -- IMPORTANTE: ¡Esto es texto plano! Hashear en la aplicación real.

-- Índices para mejorar el rendimiento de las búsquedas
CREATE INDEX idx_users_condominio_id ON users(condominio_id);
CREATE INDEX idx_devices_condominio_id ON devices(condominio_id);
CREATE INDEX idx_devices_user_id ON devices(user_id);
CREATE INDEX idx_device_status_device_id ON device_status(device_id);
CREATE INDEX idx_geofences_condominio_id ON geofences(condominio_id);
CREATE INDEX idx_map_elements_condominio_id ON map_elements(condominio_id);
