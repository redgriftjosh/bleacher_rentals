-- Auto-add event owner (created_by_user_uuid) to internal chat subscriptions.

CREATE OR REPLACE FUNCTION public.auto_subscribe_event_owner_to_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.created_by_user_uuid IS NOT DISTINCT FROM OLD.created_by_user_uuid THEN
    RETURN NEW;
  END IF;

  IF NEW.created_by_user_uuid IS NOT NULL AND NEW.deleted = false THEN
    INSERT INTO public."EventSubscriptions" (id, event_uuid, user_uuid, created_at)
    VALUES (gen_random_uuid(), NEW.id, NEW.created_by_user_uuid, now())
    ON CONFLICT (event_uuid, user_uuid) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_auto_subscribe_owner ON public."Events";

CREATE TRIGGER events_auto_subscribe_owner
  AFTER INSERT OR UPDATE OF created_by_user_uuid ON public."Events"
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_subscribe_event_owner_to_chat();

-- Backfill existing event owners who are not yet subscribed.
INSERT INTO public."EventSubscriptions" (id, event_uuid, user_uuid, created_at)
SELECT gen_random_uuid(), e.id, e.created_by_user_uuid, now()
FROM public."Events" e
WHERE e.created_by_user_uuid IS NOT NULL
  AND e.deleted = false
  AND NOT EXISTS (
    SELECT 1
    FROM public."EventSubscriptions" es
    WHERE es.event_uuid = e.id
      AND es.user_uuid = e.created_by_user_uuid
  );
