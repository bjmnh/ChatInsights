/*
  # Free report access

  Premium report generation is free for now. This does not drop billing columns,
  the payments table, or any stored reports. It only widens who can read reports.

  Authenticated users can read their own reports of any type. Clients still cannot
  insert or update reports; edge functions write them with the service role.
*/

DROP POLICY IF EXISTS "Users can read own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can read own basic reports" ON public.reports;
DROP POLICY IF EXISTS "Paid users can read own premium reports" ON public.reports;

CREATE POLICY "Users can read own reports"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own reports" ON public.reports;
REVOKE INSERT, UPDATE, DELETE ON public.reports FROM anon, authenticated;
