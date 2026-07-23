-- EventSubscriptions: account_manager_uuid → user_uuid
-- Allows both admins and account managers to be chat members (Roadmap-style).

ALTER TABLE public."EventSubscriptions"
  ADD COLUMN user_uuid uuid REFERENCES public."Users"(id);

UPDATE public."EventSubscriptions" es
SET user_uuid = am.user_uuid
FROM public."AccountManagers" am
WHERE am.id = es.account_manager_uuid;

-- Must drop before removing account_manager_uuid — old policy references that column.
DROP POLICY IF EXISTS "event_subscriptions_delete" ON public."EventSubscriptions";

ALTER TABLE public."EventSubscriptions"
  DROP CONSTRAINT IF EXISTS "EventSubscriptions_account_manager_uuid_fkey";

ALTER TABLE public."EventSubscriptions"
  DROP CONSTRAINT IF EXISTS "EventSubscriptions_event_uuid_account_manager_uuid_key";

ALTER TABLE public."EventSubscriptions"
  DROP COLUMN account_manager_uuid;

ALTER TABLE public."EventSubscriptions"
  ALTER COLUMN user_uuid SET NOT NULL;

ALTER TABLE public."EventSubscriptions"
  ADD CONSTRAINT "EventSubscriptions_event_uuid_user_uuid_key" UNIQUE (event_uuid, user_uuid);

-- Subscribed AMs (and admins) can remove other members; anyone can remove themselves.
CREATE OR REPLACE FUNCTION public.is_subscribed_to_event(p_event_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."EventSubscriptions"
    WHERE event_uuid = p_event_uuid
      AND user_uuid = public.get_current_user_uuid()
  );
$$;

CREATE POLICY "event_subscriptions_delete" ON public."EventSubscriptions"
  AS permissive FOR DELETE TO authenticated
  USING (
    'admin' = ANY(public.get_user_roles())
    OR user_uuid = public.get_current_user_uuid()
    OR (
      public.get_user_roles() && '{account_manager}'::text[]
      AND public.is_subscribed_to_event(event_uuid)
    )
  );
