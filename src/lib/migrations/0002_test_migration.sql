-- This is a test migration to verify the runner is working.
-- It creates a table and then immediately drops it.
-- If this migration appears in the 'migrations' table in the database,
-- it means the migration runner is successfully executing new scripts.

CREATE TABLE IF NOT EXISTS migration_test (
    id SERIAL PRIMARY KEY,
    test_data VARCHAR(255)
);

DROP TABLE IF EXISTS migration_test;
