-- Migration to add the can_create_admins permission to the admins table.

ALTER TABLE admins
ADD COLUMN can_create_admins BOOLEAN NOT NULL DEFAULT FALSE;

-- Grant permission to the first admin user (or a specific one)
-- This is optional, but useful to bootstrap the system.
-- You might want to run this manually for the initial super-admin.
-- UPDATE admins SET can_create_admins = TRUE WHERE email = 'your-super-admin-email@example.com';
