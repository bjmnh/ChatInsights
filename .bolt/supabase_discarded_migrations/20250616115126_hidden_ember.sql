/*
  # Storage RLS Setup for conversation-files bucket
  
  This migration sets up Row Level Security policies for the storage.objects table
  to ensure users can only access files in their own folders.
  
  1. Enable RLS on storage.objects
  2. Create policies for authenticated users to manage their own files
  3. Files are organized as: conversation-files/{user_id}/{job_id}/filename
*/

-- Enable RLS on storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload own files" ON storage.objects
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'conversation-files' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Allow authenticated users to read files from their own folder
CREATE POLICY "Users can read own files" ON storage.objects
FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'conversation-files' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Allow authenticated users to delete files from their own folder
CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'conversation-files' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Allow authenticated users to update files in their own folder
CREATE POLICY "Users can update own files" ON storage.objects
FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'conversation-files' AND 
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'conversation-files' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Update the tracking table to mark storage policies as completed
UPDATE _storage_policy_setup 
SET setup_completed = true 
WHERE bucket_name = 'conversation-files';