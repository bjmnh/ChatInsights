/*
  # Set up Storage Policies for conversation-files bucket

  1. Storage Policies
    - Allow authenticated users to upload files to their own folder
    - Allow authenticated users to read files from their own folder  
    - Allow authenticated users to delete files from their own folder
    - Allow authenticated users to update files in their own folder

  2. Security
    - Files are organized by user ID in folder structure: {user_id}/{job_id}/filename
    - Users can only access files in folders that match their auth.uid()
    - All operations require authentication
*/

-- Enable RLS on storage.objects if not already enabled
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

-- Grant necessary permissions for storage operations
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT SELECT ON storage.buckets TO authenticated;