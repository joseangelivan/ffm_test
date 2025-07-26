-- Add the ability for admins to create other admins.
ALTER TABLE admins ADD COLUMN can_create_admins BOOLEAN NOT NULL DEFAULT false;

-- Grant creation permission to the initial admin user.
UPDATE admins SET can_create_admins = true WHERE email = 'angelivan34@gmail.com';
