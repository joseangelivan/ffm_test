-- Eliminar tablas antiguas que ya no se utilizan
DROP TABLE IF EXISTS "ElementosMapa" CASCADE;
DROP TABLE IF EXISTS "Geocercas" CASCADE;
DROP TABLE IF EXISTS "Dispositivos" CASCADE;

-- Renombrar la tabla de Usuarios a admins, ya que contiene los datos que queremos mantener
ALTER TABLE "Usuarios" RENAME TO admins;

-- Alterar la tabla admins para que coincida con el nuevo esquema
ALTER TABLE admins RENAME COLUMN id_usuario TO id;
ALTER TABLE admins RENAME COLUMN contrasena_hash TO password_hash;
ALTER TABLE admins ADD COLUMN created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE admins DROP COLUMN IF EXISTS tipo_usuario;
ALTER TABLE admins DROP COLUMN IF EXISTS id_condominio;
ALTER TABLE admins DROP COLUMN IF EXISTS fecha_registro;
ALTER TABLE admins DROP COLUMN IF EXISTS fecha_creacion; -- En caso de que exista de una versión anterior

-- Crear tabla de sesiones
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de configuraciones de administrador
CREATE TABLE IF NOT EXISTS admin_settings (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'es',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Eliminar la tabla Condominios que ya no se usa
DROP TABLE IF EXISTS "Condominios" CASCADE;
