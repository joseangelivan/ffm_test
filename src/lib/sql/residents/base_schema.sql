-- Tabla para residentes de un condominio
CREATE TABLE IF NOT EXISTS residents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    location VARCHAR(255), -- Ej: "Torre A", "Bloque 5"
    housing VARCHAR(255), -- Ej: "Apto 101", "Casa 25"
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para actualizar el campo updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.residents;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON residents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
