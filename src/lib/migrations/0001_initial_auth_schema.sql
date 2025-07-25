-- Eliminar tablas que ya no se utilizan
DROP TABLE IF EXISTS localizador_dispositivos;
DROP TABLE IF EXISTS dispositivos;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS geocercas;
DROP TABLE IF EXISTS condominios;

-- Ajustar la tabla de administradores
ALTER TABLE admins DROP COLUMN IF EXISTS last_login;
ALTER TABLE admins DROP COLUMN IF EXISTS created_at;
ALTER TABLE admins DROP COLUMN IF EXISTS updated_at;

-- Ajustar la tabla de configuraciones de admin
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS theme VARCHAR(255) DEFAULT 'light';
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS language VARCHAR(255) DEFAULT 'es';
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
