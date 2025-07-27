/*
  # Storage Troubleshooting and Policy Setup

  This migration provides SQL commands to help troubleshoot and set up storage policies.
  Since storage policies can't be created directly in migrations, this provides
  the exact SQL commands that need to be run in the Supabase SQL editor.
*/

-- First, let's check if the storage bucket exists
-- Run this query to see all buckets:
-- SELECT * FROM storage.buckets;

-- If the 'conversation-files' bucket doesn't exist, create it in the Supabase dashboard
-- or run this in the SQL editor (if you have the right permissions):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('conversation-files', 'conversation-files', false);

-- Enable RLS on storage.objects (this should already be enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;

-- Policy 1: Allow authenticated users to upload their own files
-- Files are stored in structure: conversation-files/{user_id}/{job_id}/filename
CREATE POLICY "Users can upload own files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'conversation-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 2: Allow authenticated users to read their own files
CREATE POLICY "Users can read own files" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'conversation-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'conversation-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Allow authenticated users to update their own files
CREATE POLICY "Users can update own files" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'conversation-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'conversation-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Update the tracking table to mark storage policies as completed
UPDATE _storage_policy_setup 
SET setup_completed = true 
WHERE bucket_name = 'conversation-files';

-- Add a comment to help with troubleshooting
COMMENT ON TABLE _storage_policy_setup IS 'Tracks storage policy setup status. Check this table to see if storage policies have been configured.';