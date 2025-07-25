CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    sql_script TEXT NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);
