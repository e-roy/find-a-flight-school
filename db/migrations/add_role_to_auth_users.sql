-- Migration: Add role column to auth_users table and migrate data from user_profiles
-- This moves the role field from user_profiles to auth_users for better RBAC performance

-- Step 1: Create the user_role enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'school', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add role column to auth_users table with default value
ALTER TABLE auth_users
ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'user';

-- Step 3: Migrate existing role data from user_profiles to auth_users
-- This updates auth_users.role based on user_profiles.role for matching user_ids
UPDATE auth_users au
SET role = up.role
FROM user_profiles up
WHERE au.id = up.user_id
  AND up.role IS NOT NULL;

-- Step 4: Create index on role column for efficient role-based queries
CREATE INDEX IF NOT EXISTS auth_users_role_idx ON auth_users(role);

-- Step 5: Remove role column from user_profiles table
-- (Keeping the table for prefsJson if needed in the future)
ALTER TABLE user_profiles
DROP COLUMN IF EXISTS role;

-- Step 6: Drop the role index from user_profiles if it exists
DROP INDEX IF EXISTS user_profiles_role_idx;

