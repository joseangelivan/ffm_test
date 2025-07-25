-- This script transforms the database schema from an old version to the new one,
-- ensuring data is preserved.

-- Step 1: Handle the 'admins' table (previously 'Usuarios')
DO $$
BEGIN
    -- If the old 'Usuarios' table exists, rename it to 'admins'
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuarios') THEN
        ALTER TABLE "usuarios" RENAME TO "admins";
    END IF;

    -- Ensure the 'admins' table exists before trying to alter it.
    -- If it doesn't exist, it means this is a fresh install and the base_schema should have created it.
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admins') THEN
        -- Add 'name' column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='name') THEN
            ALTER TABLE "admins" ADD COLUMN "name" VARCHAR(255);
        END IF;
        
        -- Rename 'password' to 'password_hash' if 'password' exists and 'password_hash' doesn't
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='password')
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='password_hash') THEN
            ALTER TABLE "admins" RENAME COLUMN "password" TO "password_hash";
        END IF;

        -- Add 'created_at' column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='created_at') THEN
            ALTER TABLE "admins" ADD COLUMN "created_at" TIMESTAMPTZ DEFAULT NOW();
        END IF;

        -- Add 'updated_at' column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admins' AND column_name='updated_at') THEN
            ALTER TABLE "admins" ADD COLUMN "updated_at" TIMESTAMPTZ DEFAULT NOW();
        END IF;
    ELSE
        -- If 'admins' table does not exist at all, create it. This is a fallback for fresh setups.
        CREATE TABLE IF NOT EXISTS "admins" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "name" VARCHAR(255),
            "email" VARCHAR(255) UNIQUE NOT NULL,
            "password_hash" VARCHAR(255) NOT NULL,
            "created_at" TIMESTAMPTZ DEFAULT NOW(),
            "updated_at" TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;


-- Step 2: Handle 'admin_settings' table (previously 'user_preferences')
DO $$
BEGIN
    -- If the old 'user_preferences' table exists, rename it
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_preferences') THEN
        ALTER TABLE "user_preferences" RENAME TO "admin_settings";
    END IF;

    -- Ensure the 'admin_settings' table exists before trying to alter it.
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_settings') THEN
        -- Rename 'user_id' to 'admin_id' if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_settings' AND column_name='user_id')
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_settings' AND column_name='admin_id') THEN
            ALTER TABLE "admin_settings" RENAME COLUMN "user_id" TO "admin_id";
        END IF;

        -- Add 'theme' column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_settings' AND column_name='theme') THEN
            ALTER TABLE "admin_settings" ADD COLUMN "theme" VARCHAR(50) DEFAULT 'light' NOT NULL;
        END IF;

        -- Add 'language' column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_settings' AND column_name='language') THEN
            ALTER TABLE "admin_settings" ADD COLUMN "language" VARCHAR(10) DEFAULT 'es' NOT NULL;
        END IF;
        
        -- Add 'created_at' column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_settings' AND column_name='created_at') THEN
            ALTER TABLE "admin_settings" ADD COLUMN "created_at" TIMESTAMPTZ DEFAULT NOW();
        END IF;

        -- Add 'updated_at' column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_settings' AND column_name='updated_at') THEN
            ALTER TABLE "admin_settings" ADD COLUMN "updated_at" TIMESTAMPTZ DEFAULT NOW();
        END IF;
    ELSE
         -- If 'admin_settings' does not exist, create it. Fallback for fresh setups.
        CREATE TABLE IF NOT EXISTS "admin_settings" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "admin_id" UUID NOT NULL REFERENCES "admins"("id") ON DELETE CASCADE,
            "theme" VARCHAR(50) DEFAULT 'light' NOT NULL,
            "language" VARCHAR(10) DEFAULT 'es' NOT NULL,
            "created_at" TIMESTAMPTZ DEFAULT NOW(),
            "updated_at" TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE("admin_id")
        );
    END IF;
END $$;


-- Step 3: Create the 'sessions' table, which is new.
-- It's safe to use CREATE TABLE IF NOT EXISTS as there's no old data to preserve.
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "admin_id" UUID NOT NULL REFERENCES "admins"("id") ON DELETE CASCADE,
    "token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);
