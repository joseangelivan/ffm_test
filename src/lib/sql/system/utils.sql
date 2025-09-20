-- Utilidad para asegurar que una columna tenga un tipo de dato específico, alterándola solo si es necesario.
CREATE OR REPLACE FUNCTION ensure_column_type(p_table_name TEXT, p_column_name TEXT, p_column_type TEXT)
RETURNS VOID AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = p_table_name
          AND column_name = p_column_name
          AND udt_name != p_column_type
    ) THEN
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE %s USING %I::%s;',
                       p_table_name, p_column_name, p_column_type, p_column_name, p_column_type);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Utilidad para añadir una columna solo si no existe
CREATE OR REPLACE FUNCTION add_column_if_not_exists(p_table_name TEXT, p_column_name TEXT, p_column_definition TEXT)
RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = p_table_name
          AND column_name = p_column_name
    ) THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s;',
                       p_table_name, p_column_name, p_column_definition);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Utilidad para eliminar una columna solo si existe
CREATE OR REPLACE FUNCTION drop_column_if_exists(p_table_name TEXT, p_column_name TEXT)
RETURNS VOID AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = p_table_name
          AND column_name = p_column_name
    ) THEN
        EXECUTE format('ALTER TABLE %I DROP COLUMN %I;',
                       p_table_name, p_column_name);
    END IF;
END;
$$ LANGUAGE plpgsql;


-- Utilidad para renombrar una columna solo si existe y el nuevo nombre no está en uso
CREATE OR REPLACE FUNCTION rename_column_if_exists(p_table_name TEXT, p_old_column_name TEXT, p_new_column_name TEXT)
RETURNS VOID AS $$
BEGIN
    -- Comprobar si la columna antigua existe
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = p_table_name
          AND column_name = p_old_column_name
    ) THEN
        -- Comprobar si la nueva columna NO existe
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = p_table_name
              AND column_name = p_new_column_name
        ) THEN
            EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I;',
                           p_table_name, p_old_column_name, p_new_column_name);
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;
