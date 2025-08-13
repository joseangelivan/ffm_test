CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS map_element_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominium_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    icon_svg TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE
);

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON map_element_types
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
