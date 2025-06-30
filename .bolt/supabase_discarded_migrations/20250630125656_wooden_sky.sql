/*
  # Add premium_status column to users table

  1. Changes
    - Add `premium_status` column to `users` table with default value 'free'
    - Add check constraint to ensure valid premium status values

  2. Security
    - Column is added with appropriate default value
    - Existing RLS policies will continue to work
*/

-- Add premium_status column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS premium_status text DEFAULT 'free';

-- Add check constraint for valid premium status values
ALTER TABLE users 
ADD CONSTRAINT IF NOT EXISTS users_premium_status_check 
CHECK (premium_status IN ('free', 'premium', 'trial'));

-- Update any existing users to have 'free' status if null
UPDATE users 
SET premium_status = 'free' 
WHERE premium_status IS NULL;

-- Make the column NOT NULL after setting defaults
ALTER TABLE users 
ALTER COLUMN premium_status SET NOT NULL;