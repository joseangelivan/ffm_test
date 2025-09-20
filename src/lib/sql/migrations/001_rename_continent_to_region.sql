-- Renames the 'continent' column to 'region' for better generalization.
ALTER TABLE condominiums RENAME COLUMN continent TO region;
