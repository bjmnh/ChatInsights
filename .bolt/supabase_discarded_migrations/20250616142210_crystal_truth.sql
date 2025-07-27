/*
  # Clean up premium system for developer audience

  1. Database Cleanup
    - Remove unused tables and columns
    - Simplify premium access logic
    - Add premium analysis tracking

  2. Premium Access
    - Based on completed Stripe orders
    - Track premium analysis runs
    - Enable premium features for paying users

  3. Developer-focused Features
    - Rename mystical features to technical terms
    - Focus on data analysis and insights
    - Privacy-conscious approach
*/

-- Clean up unused tables
DROP TABLE IF EXISTS stripe_subscriptions CASCADE;
DROP TABLE IF EXISTS stripe_customers CASCADE;
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
  -- Check if user has any completed paid orders
  RETURN EXISTS (
    SELECT 1 
    FROM stripe_user_orders 
    WHERE customer_id IN (
      SELECT customer_id 
      FROM stripe_customers 
      WHERE user_id = user_id_param 
      AND deleted_at IS NULL
    )
    AND payment_status = 'paid'
    AND order_status = 'completed'
    AND deleted_at IS NULL
  );
END;
$$;

-- Create RLS policy for premium access
CREATE POLICY "Users can check their premium status"
  ON stripe_user_orders
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id 
      FROM stripe_customers 
      WHERE user_id = auth.uid() 
      AND deleted_at IS NULL
    )
  );

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
ON stripe_orders (customer_id, payment_status, order_status) 
WHERE deleted_at IS NULL;