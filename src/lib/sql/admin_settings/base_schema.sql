
CREATE TABLE IF NOT EXISTS public.admin_settings (
    admin_id UUID PRIMARY KEY REFERENCES public.admins(id) ON DELETE CASCADE,
    theme VARCHAR(255) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'pt-BR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_updated_at ON public.admin_settings;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
