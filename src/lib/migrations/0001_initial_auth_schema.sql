-- Migration to add the 'name' column to the 'admins' table
-- and create the 'admin_settings' table.

-- Add the 'name' column to the 'admins' table if it doesn't already exist.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'admins' AND column_name = 'name'
    ) THEN
        ALTER TABLE admins ADD COLUMN name VARCHAR(255);
    END IF;
END
$$;

-- Create the table for admin-specific settings.
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID UNIQUE NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'es',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
