CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    user_type VARCHAR(50) NOT NULL,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, user_type)
);

CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

DROP TRIGGER IF EXISTS set_timestamp_sessions ON sessions;
CREATE TRIGGER set_timestamp_sessions
BEFORE UPDATE ON sessions
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
