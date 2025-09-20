-- src/lib/sql/system/utils.sql

-- Helper function to safely change a column's type only if it's not already the desired type.
-- This prevents errors when re-running migration scripts.
CREATE OR REPLACE FUNCTION ensure_column_type(
    p_table_name TEXT,
    p_column_name TEXT,
    p_new_type TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Check if the column exists and if its type is different from the desired new type.
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = p_table_name
          AND column_name = p_column_name
          AND udt_name != p_new_type
    ) THEN
        -- If it's different, alter the column type.
        -- Using format() to safely inject identifiers.
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE %s', p_table_name, p_column_name, p_new_type);
    END IF;
END;
$$ LANGUAGE plpgsql;


-- Helper function to add a column to a table if it does not already exist.
CREATE OR REPLACE FUNCTION add_column_if_not_exists(
    p_table_name TEXT, 
    p_column_name TEXT, 
    p_column_definition TEXT
)
RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = p_table_name 
          AND column_name = p_column_name
    ) THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN %I %s', p_table_name, p_column_name, p_column_definition);
    END IF;
END;
$$ LANGUAGE plpgsql;


-- Helper function to drop a column from a table if it exists.
CREATE OR REPLACE FUNCTION drop_column_if_exists(
    p_table_name TEXT, 
    p_column_name TEXT
)
RETURNS VOID AS $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = p_table_name 
          AND column_name = p_column_name
    ) THEN
        EXECUTE format('ALTER TABLE public.%I DROP COLUMN %I', p_table_name, p_column_name);
    END IF;
END;
$$ LANGUAGE plpgsql;


-- Helper function to rename a column in a table if it exists and the new name doesn't exist.
CREATE OR REPLACE FUNCTION rename_column_if_exists(
    p_table_name TEXT, 
    p_old_column_name TEXT, 
    p_new_column_name TEXT
)
RETURNS VOID AS $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = p_table_name 
          AND column_name = p_old_column_name
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = p_table_name
        AND column_name = p_new_column_name
    ) THEN
        EXECUTE format('ALTER TABLE public.%I RENAME COLUMN %I TO %I', p_table_name, p_old_column_name, p_new_column_name);
    END IF;
END;
$$ LANGUAGE plpgsql;
