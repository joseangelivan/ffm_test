-- Drop obsolete tables if they exist
DROP TABLE IF EXISTS "Usuarios";
DROP TABLE IF EXISTS "user_preferences";

-- Ensure the 'admins' table has all the required columns
-- This assumes the 'admins' table already exists.
-- We use a function to avoid errors if the column already exists.
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='name') THEN
    ALTER TABLE "admins" ADD COLUMN "name" VARCHAR(255);
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='created_at') THEN
    ALTER TABLE "admins" ADD COLUMN "created_at" TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='updated_at') THEN
    ALTER TABLE "admins" ADD COLUMN "updated_at" TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;


-- Create 'admin_settings' table if it doesn't exist
CREATE TABLE IF NOT EXISTS "admin_settings" (
    "admin_id" UUID PRIMARY KEY REFERENCES "admins"("id") ON DELETE CASCADE,
    "theme" VARCHAR(50) DEFAULT 'light',
    "language" VARCHAR(10) DEFAULT 'es',
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Create 'sessions' table if it doesn't exist
CREATE TABLE IF NOT EXISTS "sessions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "admin_id" UUID NOT NULL REFERENCES "admins"("id") ON DELETE CASCADE,
  "token" VARCHAR(512) UNIQUE NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "idx_sessions_admin_id" ON "sessions"("admin_id");
CREATE INDEX IF NOT EXISTS "idx_sessions_expires_at" ON "sessions"("expires_at");
