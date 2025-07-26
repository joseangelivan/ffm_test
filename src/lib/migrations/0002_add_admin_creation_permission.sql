-- Adds the permission flag to the admins table to control who can create new admin accounts.
-- By default, new admins will not have this permission.
ALTER TABLE admins
ADD COLUMN can_create_admins BOOLEAN NOT NULL DEFAULT FALSE;

-- Grant creation permission to the initial default admin user.
UPDATE admins
SET can_create_admins = TRUE
WHERE email = 'admin@example.com';
