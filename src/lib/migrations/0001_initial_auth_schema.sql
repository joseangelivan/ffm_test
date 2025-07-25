-- Migration: Create initial tables for authentication and admin settings.

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create sessions table
-- This table stores active admin sessions.
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create admin_settings table
-- This table stores individual settings for each admin.
CREATE TABLE IF NOT EXISTS admin_settings (
  admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
  theme VARCHAR(255) DEFAULT 'light',
  language VARCHAR(10) DEFAULT 'es',
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
