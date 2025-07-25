-- Base de datos para la aplicación Follow For Me

-- Tabla para almacenar la información de los administradores del sistema.
-- Los administradores pueden gestionar múltiples condominios.
CREATE TABLE IF NOT EXISTS admins (
    -- Identificador único para cada administrador, generado automáticamente.
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Nombre completo del administrador.
    name VARCHAR(255) NOT NULL,
    
    -- Correo electrónico del administrador, debe ser único. Se usa para el login.
    email VARCHAR(255) UNIQUE NOT NULL,
    
    -- Hash de la contraseña del administrador, almacenada de forma segura.
    password_hash VARCHAR(255) NOT NULL,
    
    -- Fecha y hora de creación del registro del administrador.
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para gestionar las sesiones de los administradores.
-- Almacena los tokens de sesión para mantener a los usuarios autenticados.
CREATE TABLE IF NOT EXISTS sessions (
    -- Identificador numérico autoincremental para cada sesión.
    id SERIAL PRIMARY KEY,
    
    -- Referencia al administrador al que pertenece la sesión.
    -- Si se elimina un administrador, sus sesiones también se eliminan (ON DELETE CASCADE).
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
    
    -- El token JWT (JSON Web Token) que representa la sesión.
    token TEXT NOT NULL,
    
    -- Fecha y hora en la que el token de sesión expira.
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Fecha y hora de creación del registro de la sesión.
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para almacenar las configuraciones personalizadas de cada administrador.
-- Permite guardar preferencias como el tema y el idioma.
CREATE TABLE IF NOT EXISTS admin_settings (
    -- La clave primaria es el ID del administrador, asegurando una única fila de configuración por admin.
    -- También es una clave foránea que referencia a la tabla de administradores.
    admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
    
    -- Tema de la interfaz de usuario preferido por el administrador (ej. 'light', 'dark').
    theme VARCHAR(255) DEFAULT 'light',
    
    -- Idioma preferido por el administrador (ej. 'es', 'pt').
    language VARCHAR(10) DEFAULT 'es',
    
    -- Fecha y hora de la última actualización de las configuraciones.
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Nota: La lógica para insertar automáticamente una fila de configuración
-- para un nuevo administrador se maneja en el código de la aplicación (src/actions/auth.ts),
-- no directamente en el esquema SQL, para mayor flexibilidad.
