/*
  # One-time premium unlock

  Premium reports are generated once from an uploaded chat export, so access is a
  one-time purchase rather than a subscription.

  1. Users
    - `premium_status` — server-owned flag. Clients cannot change it.
    - `stripe_customer_id` — Stripe customer for Checkout.
    - `premium_unlocked_at` — when the paid unlock was recorded.

  2. Payments
    - One row per Stripe Checkout session.
    - Authenticated users can read their own rows.
    - Inserts and updates happen only from the service role (webhook / confirm).

  3. Reports
    - Premium report rows are readable only when `premium_status` is true.
    - Clients cannot insert reports. Edge functions use the service role.

  Do not apply this file from a cloud agent. The owner applies it to the project.
*/

-- Restore billing columns removed by 20250627000513_frosty_fire.sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS premium_status boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS premium_unlocked_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_customer_id_key
  ON public.users (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Older payment tables (pre file-upload rebuild) do not match this shape.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payments'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name = 'stripe_checkout_session_id'
  ) THEN
    ALTER TABLE public.payments RENAME TO payments_legacy;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_checkout_session_id text NOT NULL UNIQUE,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  price_id text,
  amount integer,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_intent
  ON public.payments (stripe_payment_intent_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own payments" ON public.payments;
CREATE POLICY "Users can read own payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.payments FROM anon, authenticated;

-- Ignore client attempts to edit billing columns. Service role (edge functions) may write them.
CREATE OR REPLACE FUNCTION public.protect_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  jwt_role text := '';
BEGIN
  BEGIN
    jwt_role := coalesce(auth.role(), '');
  EXCEPTION WHEN OTHERS THEN
    jwt_role := '';
  END;

  IF jwt_role = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.premium_status := false;
    NEW.stripe_customer_id := NULL;
    NEW.premium_unlocked_at := NULL;
    RETURN NEW;
  END IF;

  NEW.premium_status := OLD.premium_status;
  NEW.stripe_customer_id := OLD.stripe_customer_id;
  NEW.premium_unlocked_at := OLD.premium_unlocked_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_billing_columns ON public.users;
CREATE TRIGGER protect_billing_columns
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_billing_columns();

-- Premium report contents stay on the server until the account is paid.
DROP POLICY IF EXISTS "Users can read own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can read own basic reports" ON public.reports;
DROP POLICY IF EXISTS "Paid users can read own premium reports" ON public.reports;

CREATE POLICY "Users can read own basic reports"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND report_type = 'basic');

CREATE POLICY "Paid users can read own premium reports"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND report_type = 'premium'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.premium_status = true
    )
  );

DROP POLICY IF EXISTS "Users can insert own reports" ON public.reports;
REVOKE INSERT, UPDATE, DELETE ON public.reports FROM anon, authenticated;
