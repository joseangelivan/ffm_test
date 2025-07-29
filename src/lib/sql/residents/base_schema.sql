CREATE TABLE IF NOT EXISTS residents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    location_details TEXT, -- e.g., "Tower A, Apartment 101"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para la tabla residents
DROP TRIGGER IF EXISTS set_timestamp_residents ON residents;
CREATE TRIGGER set_timestamp_residents
BEFORE UPDATE ON residents
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
