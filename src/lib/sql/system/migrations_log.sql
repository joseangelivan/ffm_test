-- Stores a log of which migration scripts have been run.
CREATE TABLE IF NOT EXISTS migrations_log (
    id SERIAL PRIMARY KEY,
    -- A unique identifier for the script, e.g., a SHA-256 hash of its content.
    script_hash VARCHAR(64) UNIQUE NOT NULL,
    -- The full content of the executed SQL script for auditing purposes.
    script_content TEXT NOT NULL,
    -- Timestamp of when the script was executed.
    executed_at TIMESTAMPTZ DEFAULT NOW()
);
