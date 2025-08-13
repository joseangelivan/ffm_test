
CREATE TABLE IF NOT EXISTS public.map_element_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    icon_svg TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_updated_at ON public.map_element_types;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.map_element_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
