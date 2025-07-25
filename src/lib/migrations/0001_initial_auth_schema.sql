-- src/lib/migrations/0001_initial_auth_schema.sql

-- Eliminar tablas en orden inverso para evitar problemas de dependencias de claves foráneas
DROP TABLE IF EXISTS localizador_dispositivos;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS dispositivos;
DROP TABLE IF EXISTS admin_settings;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS admins;

-- Eliminar secuencias
DROP SEQUENCE IF EXISTS dispositivos_id_seq;
DROP SEQUENCE IF EXISTS usuarios_id_seq;
DROP SEQUENCE IF EXISTS localizador_dispositivos_id_seq;

-- 1. Tabla de Administradores
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Sesiones
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Configuraciones de Administrador
CREATE TABLE admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light' NOT NULL,
    language VARCHAR(10) DEFAULT 'es' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Secuencias para las tablas principales
CREATE SEQUENCE IF NOT EXISTS dispositivos_id_seq;
CREATE SEQUENCE IF NOT EXISTS usuarios_id_seq;
CREATE SEQUENCE IF NOT EXISTS localizador_dispositivos_id_seq;

-- 5. Tabla de Dispositivos
CREATE TABLE dispositivos (
    id INT PRIMARY KEY DEFAULT nextval('dispositivos_id_seq'),
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(100),
    estado VARCHAR(50),
    ultima_latitud DECIMAL(10, 8),
    ultima_longitud DECIMAL(11, 8),
    nivel_bateria INT,
    fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- 6. Tabla de Usuarios
CREATE TABLE usuarios (
    id INT PRIMARY KEY DEFAULT nextval('usuarios_id_seq'),
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    id_dispositivo INT REFERENCES dispositivos(id),
    fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- 7. Tabla de Localizador de Dispositivos (Historial)
CREATE TABLE localizador_dispositivos (
    id INT PRIMARY KEY DEFAULT nextval('localizador_dispositivos_id_seq'),
    id_dispositivo INT REFERENCES dispositivos(id),
    latitud DECIMAL(10, 8),
    longitud DECIMAL(11, 8),
    fecha_hora TIMESTAMP DEFAULT NOW()
);
