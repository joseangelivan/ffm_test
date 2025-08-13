-- Crear la extensión pgcrypto si no existe, necesaria para el hash de contraseñas.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS residents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    housing VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_residents_updated_at
BEFORE UPDATE ON residents
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Insertar residentes de ejemplo
-- La contraseña para ambos es '123456'
INSERT INTO residents (condominium_id, name, email, password_hash, location, housing, phone)
SELECT id, 'Alice Residente', 'alice@email.com', crypt('123456', gen_salt('bf')), 'Bloco A', 'Apto 101', '+5511999999999'
FROM condominiums WHERE name = 'Condomínio Exemplo'
ON CONFLICT (email) DO NOTHING;

INSERT INTO residents (condominium_id, name, email, password_hash, location, housing, phone)
SELECT id, 'Bob Residente', 'bob@email.com', crypt('123456', gen_salt('bf')), 'Bloco B', 'Apto 202', '+5511888888888'
FROM condominiums WHERE name = 'Condomínio Exemplo'
ON CONFLICT (email) DO NOTHING;
