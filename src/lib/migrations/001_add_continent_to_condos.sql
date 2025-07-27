-- This migration is safely repeatable. It will only add the column if it doesn't exist.
DO $$
BEGIN
   IF NOT EXISTS (
      SELECT 1
      FROM   information_schema.columns
      WHERE  table_name = 'condominiums'
      AND    column_name = 'continent'
   ) THEN
      ALTER TABLE condominiums ADD COLUMN continent VARCHAR(255);
   END IF;
END
$$;
