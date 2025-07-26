-- Migration script to transition from base_schema.sql to schema.sql structure.

-- Step 1: Drop tables that are no longer needed in the new schema.
DROP TABLE IF EXISTS geocercas;
DROP TABLE IF EXISTS localizador_dispositivos;
DROP TABLE IF EXISTS dispositivos;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS condominios;
