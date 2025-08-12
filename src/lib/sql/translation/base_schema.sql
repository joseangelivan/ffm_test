-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';


CREATE TABLE IF NOT EXISTS translation_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    config_json JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    supported_languages JSONB, -- Array of language codes like ['en', 'es', 'fr']
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Add updated_at trigger
CREATE TRIGGER update_translation_services_updated_at
BEFORE UPDATE ON translation_services
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
