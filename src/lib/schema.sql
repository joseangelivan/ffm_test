-- Base de datos inicial para Follow For Me

-- Tabla para administradores del sistema
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para gestionar las sesiones de los administradores
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para guardar las configuraciones de cada administrador
CREATE TABLE IF NOT EXISTS admin_settings (
  admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
  theme VARCHAR(255) DEFAULT 'light',
  language VARCHAR(10) DEFAULT 'es',
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para llevar un registro de las migraciones aplicadas
CREATE TABLE IF NOT EXISTS migrations (
  id VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
