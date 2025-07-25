-- Eliminar tablas que ya no existen en el nuevo esquema
DROP TABLE IF EXISTS condominios;
DROP TABLE IF EXISTS geofences;
DROP TABLE IF EXISTS localizador_dispositivos;
DROP TABLE IF EXISTS dispositivos;
DROP TABLE IF EXISTS usuarios;

-- Modificar la tabla admins para eliminar columnas obsoletas
ALTER TABLE admins DROP COLUMN IF EXISTS condominio_id;
ALTER TABLE admins DROP COLUMN IF EXISTS salt;
ALTER TABLE admins DROP COLUMN IF EXISTS reset_token;
ALTER TABLE admins DROP COLUMN IF EXISTS reset_token_expires_at;

-- Modificar la tabla admin_settings para añadir las nuevas columnas
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS theme VARCHAR(255) DEFAULT 'light';
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS language VARCHAR(255) DEFAULT 'es';
