-- Reusable function to ensure a column is of a specific data type.
-- This is useful for making schema definitions more robust and idempotent.
CREATE OR REPLACE FUNCTION ensure_column_type(p_table_name TEXT, p_column_name TEXT, p_expected_type TEXT)
RETURNS VOID AS $$
BEGIN
    -- Check if the column exists and is not already of the expected type
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = p_table_name
          AND column_name = p_column_name
          AND data_type <> p_expected_type
    ) THEN
        -- If it exists with a different type, alter it.
        -- Using format() with %I for identifiers and %L for literals is the safe way to do dynamic SQL.
        -- Since the type is a string literal we trust, we can use %s, but %I is safer for table/column names.
        RAISE NOTICE 'Altering column %.% to type %', p_table_name, p_column_name, p_expected_type;
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE %s;', p_table_name, p_column_name, p_expected_type);
    ELSE
        RAISE NOTICE 'Column %.% is already of type % or does not exist, skipping alteration.', p_table_name, p_column_name, p_expected_type;
    END IF;
END;
$$ LANGUAGE plpgsql;
