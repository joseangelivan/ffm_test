-- Tabla para almacenar la información de los administradores.
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para almacenar las sesiones de los administradores.
-- El admin_id está vinculado a la tabla de administradores.
-- ON DELETE CASCADE asegura que si un administrador es eliminado, sus sesiones también lo serán.
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para almacenar las configuraciones de cada administrador.
-- El admin_id es tanto la clave primaria como una clave foránea a la tabla de administradores.
-- Esto asegura una relación uno a uno: cada administrador tiene un único registro de configuración.
CREATE TABLE IF NOT EXISTS admin_settings (
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(255) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'es',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
