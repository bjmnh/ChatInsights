/*
  # Remove premium_status column references

  This migration removes any references to the premium_status column that doesn't exist
  in the users table, fixing the authentication error.
*/

-- Check if there are any triggers or functions referencing premium_status
-- and remove them if they exist

-- First, let's see what's causing the issue by checking for any policies or triggers
-- that might be referencing the non-existent premium_status column

-- Drop any policies that might reference premium_status (if they exist)
DO $$
BEGIN
  -- Check if any RLS policies reference premium_status and drop them
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname LIKE '%premium%'
  ) THEN
    DROP POLICY IF EXISTS "Users can read premium status" ON public.users;
    DROP POLICY IF EXISTS "Users can update premium status" ON public.users;
  END IF;
END $$;

-- Check for any functions that might be trying to insert premium_status
-- This is likely in the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();