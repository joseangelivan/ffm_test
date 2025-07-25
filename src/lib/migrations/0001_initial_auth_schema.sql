-- Punto de Partida del Esquema de Autenticación
-- Este script configura las tablas iniciales necesarias para la autenticación y gestión de administradores.

-- Tabla de Administradores
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Sesiones para Administradores
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Configuraciones de Administrador
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light' NOT NULL,
    language VARCHAR(10) DEFAULT 'es' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Secuencias para IDs autoincrementales
CREATE SEQUENCE IF NOT EXISTS dispositivos_id_seq;
CREATE SEQUENCE IF NOT EXISTS usuarios_id_seq;
CREATE SEQUENCE IF NOT EXISTS localizador_dispositivos_id_seq;

-- Tabla de Dispositivos
CREATE TABLE IF NOT EXISTS dispositivos (
    id INT PRIMARY KEY DEFAULT nextval('dispositivos_id_seq'),
    nombre VARCHAR(255),
    descripcion TEXT,
    device_id VARCHAR(255) UNIQUE,
    user_id INT,
    condominio_id INT,
    token_autenticacion VARCHAR(255),
    fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT PRIMARY KEY DEFAULT nextval('usuarios_id_seq'),
    nombre VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    contrasena VARCHAR(255),
    fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- Tabla de Localizador de Dispositivos
CREATE TABLE IF NOT EXISTS localizador_dispositivos (
    id INT PRIMARY KEY DEFAULT nextval('localizador_dispositivos_id_seq'),
    dispositivo_id INT REFERENCES dispositivos(id),
    latitud DOUBLE PRECISION,
    longitud DOUBLE PRECISION,
    fecha_hora TIMESTAMP DEFAULT NOW()
);

-- Punto de Finalización del Esquema de Autenticación
