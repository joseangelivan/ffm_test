
CREATE TABLE IF NOT EXISTS gatekeepers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    condominium_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gatekeeper_settings (
    gatekeeper_id UUID PRIMARY KEY REFERENCES gatekeepers(id) ON DELETE CASCADE,
    theme VARCHAR(10) DEFAULT 'light',
    language VARCHAR(5) DEFAULT 'pt',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS access_logs (
    id SERIAL PRIMARY KEY,
    resident_id UUID NOT NULL REFERENCES residents(id),
    condominium_id UUID NOT NULL,
    access_type VARCHAR(10) NOT NULL CHECK (access_type IN ('entry', 'exit')),
    gatekeeper_id UUID NOT NULL REFERENCES gatekeepers(id),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
