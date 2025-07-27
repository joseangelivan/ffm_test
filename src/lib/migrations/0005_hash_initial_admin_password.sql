-- Actualiza la contraseña del administrador inicial a un hash bcrypt si aún no lo es.
UPDATE admins
SET password_hash = crypt('adminivan123', gen_salt('bf'))
WHERE email = 'angelivan34@gmail.com' AND password_hash = 'adminivan123';
