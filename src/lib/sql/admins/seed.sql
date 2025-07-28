
-- This is a template for seeding the first admin.
-- The password hash will be dynamically replaced by the migration script.
INSERT INTO admins (name, email, password_hash, can_create_admins)
VALUES ('José Angel Iván Rubianes Silva', 'angelivan34@gmail.com', '{{ADMIN_PASSWORD_HASH}}', TRUE)
ON CONFLICT (email) DO NOTHING;

    