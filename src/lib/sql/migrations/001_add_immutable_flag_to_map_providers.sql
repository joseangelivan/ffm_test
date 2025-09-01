-- Add is_immutable column to map_providers table
ALTER TABLE map_providers
ADD COLUMN is_immutable BOOLEAN NOT NULL DEFAULT FALSE;
