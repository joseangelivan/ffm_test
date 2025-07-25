-- Migration to add the 'name' column to the 'admins' table if it doesn't exist.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'admins' AND column_name = 'name'
    ) THEN
        ALTER TABLE admins ADD COLUMN name VARCHAR(255);
    END IF;
END $$;
