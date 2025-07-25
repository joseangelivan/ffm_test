-- Migration script to transition from the old schema to the new, simplified auth schema.

-- Step 1: Drop tables that are no longer needed.
DROP TABLE IF EXISTS localizador_dispositivos;
DROP TABLE IF EXISTS dispositivos;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS geocercas;
DROP TABLE IF EXISTS condominios;

-- Step 2: Alter existing tables to match the new schema, preserving existing data.

-- The 'admins' table is assumed to be correct and does not require alteration.
-- If it had extra columns, we would use:
-- ALTER TABLE admins DROP COLUMN IF EXISTS some_old_column;

-- The 'sessions' table is also assumed to be correct.
-- No alterations needed.

-- The 'admin_settings' table is also assumed to be correct.
-- No alterations needed.
