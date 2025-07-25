-- Migration to create the 'sessions' table for authentication
-- and drop the obsolete 'user_preferences' table.

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop the old preferences table as it has been replaced by admin_settings
DROP TABLE IF EXISTS user_preferences;
