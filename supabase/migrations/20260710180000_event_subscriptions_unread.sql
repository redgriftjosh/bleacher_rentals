-- Per-user conversation unread flag (mark unread without clearing read receipts).

ALTER TABLE public."EventSubscriptions"
  ADD COLUMN IF NOT EXISTS unread boolean NOT NULL DEFAULT false;

CREATE POLICY "event_subscriptions_update" ON public."EventSubscriptions"
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    'admin' = ANY(public.get_user_roles())
    OR user_uuid = public.get_current_user_uuid()
  )
  WITH CHECK (
    'admin' = ANY(public.get_user_roles())
    OR user_uuid = public.get_current_user_uuid()
  );
