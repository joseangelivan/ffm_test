-- 1. Eliminar tablas que ya no existen en el nuevo esquema.
DROP TABLE IF EXISTS localizador_dispositivos;
DROP TABLE IF EXISTS dispositivos;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS geocercas;
DROP TABLE IF EXISTS condominios;

-- 2. Modificar la tabla 'admins' para que coincida con el esquema final.
-- Se eliminan columnas que ya no son necesarias.
ALTER TABLE admins
  DROP COLUMN IF EXISTS last_login,
  DROP COLUMN IF EXISTS role;

-- 3. Modificar la tabla 'sessions'.
-- No hay columnas que eliminar o agregar en 'sessions' según el esquema final,
-- por lo que no se necesitan acciones para esta tabla.

-- 4. Modificar la tabla 'admin_settings'.
-- Se agregan las nuevas columnas de configuración con valores por defecto.
ALTER TABLE admin_settings
  ADD COLUMN IF NOT EXISTS theme VARCHAR(50) NOT NULL DEFAULT 'light',
  ADD COLUMN IF NOT EXISTS language VARCHAR(10) NOT NULL DEFAULT 'es';
