/*
  # Setup Storage Policies for conversation-files bucket
  
  This migration sets up Row Level Security policies for the conversation-files storage bucket.
  Since we cannot directly modify storage.objects table, we'll use Supabase's storage policy functions.
  
  1. Storage Policies
    - Allow authenticated users to upload files to their own folder
    - Allow authenticated users to read files from their own folder  
    - Allow authenticated users to delete files from their own folder
    - Allow authenticated users to update files in their own folder
    
  2. Security
    - Files are organized as: conversation-files/{user_id}/{job_id}/filename
    - Users can only access files in folders that match their user ID
*/

-- Note: Storage policies in Supabase are typically managed through the dashboard
-- or using the storage.create_policy() function. However, since we're in a migration,
-- we'll create a function that can be called to set up the policies.

-- Create a function to set up storage policies
CREATE OR REPLACE FUNCTION setup_storage_policies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function would typically call Supabase's storage policy functions
  -- but since those aren't available in migrations, we'll document the policies
  -- that need to be created manually in the Supabase dashboard
  
  RAISE NOTICE 'Storage policies need to be created manually in Supabase dashboard';
  RAISE NOTICE 'Bucket: conversation-files';
  RAISE NOTICE 'Policy 1: Upload - Allow authenticated users to upload to their own folder';
  RAISE NOTICE 'Policy 2: Select - Allow authenticated users to read from their own folder';
  RAISE NOTICE 'Policy 3: Delete - Allow authenticated users to delete from their own folder';
  RAISE NOTICE 'Policy 4: Update - Allow authenticated users to update in their own folder';
END;
$$;

-- Call the function to display the notices
SELECT setup_storage_policies();

-- Drop the function as it's no longer needed
DROP FUNCTION setup_storage_policies();

-- Create a table to track that storage policies need manual setup
CREATE TABLE IF NOT EXISTS _storage_policy_setup (
  id serial PRIMARY KEY,
  bucket_name text NOT NULL,
  policies_needed text[],
  setup_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Insert a record indicating storage policies need setup
INSERT INTO _storage_policy_setup (bucket_name, policies_needed, setup_completed)
VALUES (
  'conversation-files',
  ARRAY[
    'Upload: Allow authenticated users to upload to folder matching auth.uid()',
    'Select: Allow authenticated users to read from folder matching auth.uid()',
    'Delete: Allow authenticated users to delete from folder matching auth.uid()',
    'Update: Allow authenticated users to update in folder matching auth.uid()'
  ],
  false
)
ON CONFLICT DO NOTHING;