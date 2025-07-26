-- src/lib/migrations/0000_create_migrations_table.sql

-- This table tracks which migration scripts have already been applied.
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sql_script TEXT
);
