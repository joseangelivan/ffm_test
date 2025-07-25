-- Fase 1: Limpieza Exhaustiva de Tablas Obsoletas
-- Eliminamos todas las tablas que no forman parte del esquema final para asegurar un estado limpio.
DROP TABLE IF EXISTS "Usuarios";
DROP TABLE IF EXISTS "user_preferences";
-- Agregamos aquí cualquier otra tabla que sepamos que es obsoleta.
-- Por ejemplo:
-- DROP TABLE IF EXISTS "old_logs";
-- DROP TABLE IF EXISTS "temp_data";

-- Fase 2: Creación y Sincronización del Esquema Final
-- Nos aseguramos de que todas las tablas requeridas por la aplicación existan
-- y tengan la estructura correcta. Usar "IF NOT EXISTS" es seguro aquí
-- porque la fase 1 ya ha limpiado cualquier posible conflicto de nombres.

CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'es',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nota: La tabla `migrations` es gestionada directamente por la función `runMigrations`
-- y no necesita ser incluida en este script.
