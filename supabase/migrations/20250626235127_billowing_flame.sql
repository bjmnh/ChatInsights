/*
  # Clean rebuild - Simple file upload and report system

  1. Clean Tables
    - Keep only essential tables: users, uploaded_files, reports
    - Remove complex job tracking and premium systems for now
    
  2. Simple Schema
    - uploaded_files: track uploaded conversation files
    - reports: store generated reports (basic/premium)
    
  3. Security
    - Basic RLS policies for user data access
*/

-- Drop existing complex tables
DROP TABLE IF EXISTS user_reports CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS stripe_orders CASCADE;
DROP TABLE IF EXISTS stripe_customers CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS _storage_policy_setup CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS job_status CASCADE;
DROP TYPE IF EXISTS stripe_subscription_status CASCADE;
DROP TYPE IF EXISTS stripe_order_status CASCADE;

-- Create simple uploaded_files table
CREATE TABLE IF NOT EXISTS uploaded_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  filename text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  has_basic_report boolean DEFAULT false,
  has_premium_report boolean DEFAULT false
);

-- Create simple reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  file_id uuid REFERENCES uploaded_files(id) ON DELETE CASCADE NOT NULL,
  report_type text NOT NULL CHECK (report_type IN ('basic', 'premium')),
  report_data jsonb NOT NULL,
  generated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON uploaded_files(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_file_id ON reports(file_id);

-- Enable RLS
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for uploaded_files
CREATE POLICY "Users can read own files"
  ON uploaded_files
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own files"
  ON uploaded_files
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own files"
  ON uploaded_files
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own files"
  ON uploaded_files
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create RLS policies for reports
CREATE POLICY "Users can read own reports"
  ON reports
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own reports"
  ON reports
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own reports"
  ON reports
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());