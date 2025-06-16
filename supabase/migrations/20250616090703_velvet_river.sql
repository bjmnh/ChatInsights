/*
  # Fix user registration trigger

  1. Database Functions
    - Create or replace `handle_new_user()` function to automatically create user profiles
    - Function extracts user data from auth.users and inserts into public.users

  2. Triggers
    - Create trigger `on_auth_user_created` that fires after new user insertion in auth.users
    - Ensures every new auth user gets a corresponding profile in public.users

  3. Security
    - Function runs with SECURITY DEFINER to have proper permissions
    - Handles potential conflicts gracefully with ON CONFLICT clause
*/

-- Create or replace the function to handle new user sign-ups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, premium_status, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger that fires after a new user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;