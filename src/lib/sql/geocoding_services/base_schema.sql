-- Crear la función de actualización de timestamp si no existe
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW(); 
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear la tabla para los servicios de geocodificación
CREATE TABLE IF NOT EXISTS geocoding_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    config_json JSONB,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear un índice en is_default para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_geocoding_services_is_default ON geocoding_services (is_default);

-- Crear el trigger para actualizar 'updated_at' en cada modificación
DROP TRIGGER IF EXISTS update_geocoding_services_timestamp ON geocoding_services;
CREATE TRIGGER update_geocoding_services_timestamp
BEFORE UPDATE ON geocoding_services
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
