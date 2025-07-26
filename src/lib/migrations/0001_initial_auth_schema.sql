-- Migration from base_schema.sql to schema.sql

-- Step 1: Drop tables that are no longer needed in the final schema.
DROP TABLE IF EXISTS geocercas;
DROP TABLE IF EXISTS localizador_dispositivos;
DROP TABLE IF EXISTS dispositivos;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS condominios;

-- Step 2: Alter the 'admins' table to match the final schema.
-- The 'avatar_url' column exists in base_schema but not in the final schema.
ALTER TABLE admins DROP COLUMN IF EXISTS avatar_url;
