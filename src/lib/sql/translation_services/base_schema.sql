
CREATE TABLE IF NOT EXISTS public.translation_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    config_json JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    supported_languages JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_updated_at ON public.translation_services;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.translation_services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
