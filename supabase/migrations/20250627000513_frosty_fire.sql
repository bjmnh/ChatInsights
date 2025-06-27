/*
  # Remove Stripe Integration

  1. Drop Stripe-related tables and functions
    - Drop stripe_customers table
    - Drop stripe_orders table  
    - Drop user_has_premium_access function
    - Remove premium_status from users table

  2. Clean up unused types
    - Drop stripe-related enum types

  3. Security
    - Remove RLS policies for dropped tables
*/

-- Drop views first
DROP VIEW IF EXISTS stripe_user_subscriptions CASCADE;
DROP VIEW IF EXISTS stripe_user_orders CASCADE;

-- Drop tables
DROP TABLE IF EXISTS stripe_orders CASCADE;
DROP TABLE IF EXISTS stripe_customers CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS user_has_premium_access(uuid) CASCADE;

-- Drop types
DROP TYPE IF EXISTS stripe_subscription_status CASCADE;
DROP TYPE IF EXISTS stripe_order_status CASCADE;

-- Remove premium_status column from users table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'premium_status'
  ) THEN
    ALTER TABLE users DROP COLUMN premium_status;
  END IF;
END $$;

-- Remove stripe_customer_id column from users table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE users DROP COLUMN stripe_customer_id;
  END IF;
END $$;