/*
  # Clean up premium system and add professional developer features

  1. Database Cleanup
    - Remove unused Stripe tables that are no longer needed
    - Add premium analysis tracking to jobs and reports tables
    
  2. Premium Access System
    - Add function to check premium access based on completed orders
    - Update policies for premium features
    
  3. Professional Feature Tracking
    - Track analysis type (basic vs premium)
    - Enable premium features for qualified users
*/

-- Clean up unused tables (keeping stripe_orders and related tables)
DROP TABLE IF EXISTS stripe_subscriptions CASCADE;
DROP TABLE IF EXISTS payments CASCADE;

-- Add premium analysis tracking to jobs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'analysis_type'
  ) THEN
    ALTER TABLE jobs ADD COLUMN analysis_type text DEFAULT 'basic' CHECK (analysis_type IN ('basic', 'premium'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'premium_features_enabled'
  ) THEN
    ALTER TABLE jobs ADD COLUMN premium_features_enabled boolean DEFAULT false;
  END IF;
END $$;

-- Update user_reports to track premium analysis
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_reports' AND column_name = 'analysis_type'
  ) THEN
    ALTER TABLE user_reports ADD COLUMN analysis_type text DEFAULT 'basic' CHECK (analysis_type IN ('basic', 'premium'));
  END IF;
END $$;

-- Create function to check if user has premium access
CREATE OR REPLACE FUNCTION user_has_premium_access(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has any completed paid orders using the stripe_orders table directly
  RETURN EXISTS (
    SELECT 1 
    FROM stripe_orders so
    JOIN stripe_customers sc ON so.customer_id = sc.customer_id
    WHERE sc.user_id = user_id_param
    AND so.payment_status = 'paid'
    AND so.status = 'completed'
    AND so.deleted_at IS NULL
    AND sc.deleted_at IS NULL
  );
END;
$$;

-- Update jobs table policies to include premium analysis
DROP POLICY IF EXISTS "Users can insert own jobs" ON jobs;
CREATE POLICY "Users can insert own jobs"
  ON jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own jobs" ON jobs;
CREATE POLICY "Users can update own jobs"
  ON jobs
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Add index for premium access queries
CREATE INDEX IF NOT EXISTS idx_stripe_orders_customer_status 
ON stripe_orders (customer_id, payment_status, status) 
WHERE deleted_at IS NULL;

-- Add index for stripe_customers user lookup
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id 
ON stripe_customers (user_id) 
WHERE deleted_at IS NULL;