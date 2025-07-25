-- Drop tables in reverse order of creation to handle dependencies
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS admin_settings;
DROP TABLE IF EXISTS admins;

-- Create admins table
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create admin_settings table
CREATE TABLE admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID UNIQUE NOT NULL,
    theme VARCHAR(50) DEFAULT 'light' NOT NULL,
    language VARCHAR(10) DEFAULT 'es' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_admin
        FOREIGN KEY(admin_id) 
        REFERENCES admins(id)
        ON DELETE CASCADE
);

-- Create sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL,
    token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_admin
        FOREIGN KEY(admin_id) 
        REFERENCES admins(id)
        ON DELETE CASCADE
);
