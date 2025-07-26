-- Migration to transition from base_schema.sql to schema.sql

-- Step 1: Drop tables that are no longer in use.
DROP TABLE IF EXISTS geocercas;
DROP TABLE IF EXISTS localizador_dispositivos;
DROP TABLE IF EXISTS dispositivos;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS condominios;

-- Step 2: Modify existing tables to match the new schema.
-- Remove avatar_url from admins table.
ALTER TABLE admins DROP COLUMN IF EXISTS avatar_url;
