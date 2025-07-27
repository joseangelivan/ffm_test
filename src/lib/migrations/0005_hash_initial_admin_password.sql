-- Esta migración actualiza la contraseña del administrador inicial para que sea un hash bcrypt.
-- Se ejecuta de forma segura, solo si la contraseña actual está en texto plano.
UPDATE admins
SET password_hash = crypt('adminivan123', gen_salt('bf'))
WHERE email = 'angelivan34@gmail.com' AND password_hash = 'adminivan123';
