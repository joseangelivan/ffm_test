
CREATE TABLE IF NOT EXISTS translation_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    config_json JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION ensure_single_default_translation_service()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE translation_services
    SET is_default = FALSE
    WHERE id != NEW.id AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default_translation_service
BEFORE INSERT OR UPDATE ON translation_services
FOR EACH ROW
EXECUTE FUNCTION ensure_single_default_translation_service();

-- Create a function to set a default if none exists after a delete
CREATE OR REPLACE FUNCTION handle_default_translation_service_deletion()
RETURNS TRIGGER AS $$
DECLARE
  active_defaults_count INT;
BEGIN
  -- Check if the deleted row was the default
  IF OLD.is_default = TRUE THEN
    -- Check if any other default exists (should not happen due to the other trigger, but as a safeguard)
    SELECT count(*) INTO active_defaults_count FROM translation_services WHERE is_default = TRUE;
    
    -- If no other default exists, make another one the default
    IF active_defaults_count = 0 THEN
      UPDATE translation_services
      SET is_default = TRUE
      WHERE id = (SELECT id FROM translation_services ORDER BY created_at ASC LIMIT 1);
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_default_translation_service_deletion
AFTER DELETE ON translation_services
FOR EACH ROW
EXECUTE FUNCTION handle_default_translation_service_deletion();
