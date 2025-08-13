
CREATE TABLE IF NOT EXISTS public.device_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_translations JSONB NOT NULL,
    features_translations JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS device_types_name_translations_pt_br_key ON public.device_types ((name_translations->>'pt-BR'));

DROP TRIGGER IF EXISTS set_updated_at ON public.device_types;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.device_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed an initial device type
INSERT INTO device_types (name_translations) VALUES ('{"es": "Teléfono Inteligente", "pt-BR": "Smartphone"}') ON CONFLICT ((name_translations->>'pt-BR')) DO NOTHING;
