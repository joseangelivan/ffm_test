-- Migration script to align the database schema with the final version.

-- Step 1: Drop obsolete tables that are no longer in use.
-- These tables were part of the old schema but are not present in the target schema.
DROP TABLE IF EXISTS geocercas;
DROP TABLE IF EXISTS localizador_dispositivos;
DROP TABLE IF EXISTS dispositivos;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS condominios;
