-- src/lib/sql/system/utils.sql

CREATE OR REPLACE FUNCTION ensure_column_type(
    p_table_name TEXT,
    p_column_name TEXT,
    p_expected_type TEXT
) RETURNS VOID AS $$
DECLARE
    v_current_type TEXT;
BEGIN
    -- Get the current data type of the column
    SELECT data_type INTO v_current_type
    FROM information_schema.columns
    WHERE table_name = p_table_name AND column_name = p_column_name;

    -- If the column exists and the type is different, alter it
    IF v_current_type IS NOT NULL AND v_current_type != p_expected_type THEN
        BEGIN
            EXECUTE 'ALTER TABLE ' || quote_ident(p_table_name) ||
                    ' ALTER COLUMN ' || quote_ident(p_column_name) ||
                    ' TYPE ' || p_expected_type ||
                    ' USING ' || quote_ident(p_column_name) || '::' || p_expected_type;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not change column type for %.% to %: %', p_table_name, p_column_name, p_expected_type, SQLERRM;
        END;
    END IF;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION add_column_if_not_exists(
    p_table_name TEXT,
    p_column_name TEXT,
    p_column_definition TEXT
) RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = p_table_name AND column_name = p_column_name
    ) THEN
        EXECUTE 'ALTER TABLE ' || quote_ident(p_table_name) ||
                ' ADD COLUMN ' || quote_ident(p_column_name) || ' ' || p_column_definition;
    END IF;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION drop_column_if_exists(
    p_table_name TEXT,
    p_column_name TEXT
) RETURNS VOID AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = p_table_name AND column_name = p_column_name
    ) THEN
        EXECUTE 'ALTER TABLE ' || quote_ident(p_table_name) ||
                ' DROP COLUMN ' || quote_ident(p_column_name);
    END IF;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION rename_column_if_exists(
    p_table_name TEXT,
    p_old_column_name TEXT,
    p_new_column_name TEXT
) RETURNS VOID AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = p_table_name AND column_name = p_old_column_name
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = p_table_name AND column_name = p_new_column_name
    ) THEN
        EXECUTE 'ALTER TABLE ' || quote_ident(p_table_name) ||
                ' RENAME COLUMN ' || quote_ident(p_old_column_name) || ' TO ' || quote_ident(p_new_column_name);
    END IF;
END;
$$ LANGUAGE plpgsql;
