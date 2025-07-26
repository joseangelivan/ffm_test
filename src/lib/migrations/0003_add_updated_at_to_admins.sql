-- Add updated_at column to admins table to track the last update time.
ALTER TABLE admins
ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Create a trigger to automatically update the updated_at column on any row modification.
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admins_modtime
    BEFORE UPDATE ON admins
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();