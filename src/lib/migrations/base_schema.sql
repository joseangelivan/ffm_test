-- This is the foundational schema.
-- It represents the state of the database BEFORE any incremental migrations are applied.
-- It should only contain CREATE TABLE IF NOT EXISTS statements.

CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- This is a legacy table that we will remove in a later migration.
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY,
    user_id UUID,
    setting_key VARCHAR(100),
    setting_value VARCHAR(255)
);
