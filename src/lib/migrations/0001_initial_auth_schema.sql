-- Eliminar tablas que ya no se utilizan en el nuevo esquema
DROP TABLE IF EXISTS localizador_dispositivos;
DROP TABLE IF EXISTS dispositivos;
DROP TABLE IF EXISTS usuarios;

-- Ajustar la tabla admins para que coincida con el nuevo esquema
-- Eliminar columnas que ya no existen
ALTER TABLE admins DROP COLUMN IF EXISTS condominio_id;
ALTER TABLE admins DROP COLUMN IF EXISTS salt;
ALTER TABLE admins DROP COLUMN IF EXISTS reset_token;
ALTER TABLE admins DROP COLUMN IF EXISTS reset_token_expires_at;

-- Ajustar la tabla admin_settings
-- Añadir nuevas columnas con valores por defecto para no afectar a las filas existentes
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS theme VARCHAR(255) DEFAULT 'light';
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'es';
