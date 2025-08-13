-- Crear la extensión pgcrypto si no existe, necesaria para el hash de contraseñas.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS gatekeepers (
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

CREATE OR REPLACE TRIGGER update_gatekeepers_updated_at
BEFORE UPDATE ON gatekeepers
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Insertar usuario de portería de ejemplo
-- La contraseña es '123456'
INSERT INTO gatekeepers (condominium_id, name, email, password_hash, location, housing, phone)
SELECT id, 'Carlos Porteiro', 'carlos@email.com', crypt('123456', gen_salt('bf')), 'Entrada Principal', 'Guarita 1', '+5511987654321'
FROM condominiums WHERE name = 'Condomínio Exemplo'
ON CONFLICT (email) DO NOTHING;
