-- ============================================================================
-- Tell the manager when a driver took a different bleacher.
--
-- Server-side on purpose: the driver confirms the bleacher while standing in
-- the warehouse, usually offline, and the row can reach Postgres hours later.
-- A client-side notification would fire on the wrong device at the wrong time,
-- or not at all.
-- ============================================================================

-- Labels are duplicated from src/features/workTrackers/util/bleacherSwap.ts
-- (and from the mobile app) because a push body is rendered here, with no
-- client in the loop. Keep the three in sync when a code is added.
create or replace function public.bleacher_change_reason_label(code text)
returns text
language sql
immutable
as $$
  select case code
    when 'hard_to_access'         then 'Hard to get to'
    when 'blocked_by_other_units' then 'Blocked by other bleachers'
    when 'damaged'                then 'Assigned one is damaged'
    when 'not_on_site'            then 'Not on site'
    when 'other'                  then 'Other'
    when null                     then 'No reason given'
    else 'Unrecognized reason'
  end;
$$;

create or replace function public.notify_bleacher_swap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id        uuid;
  assigned_number text;
  actual_number   text;
begin
  -- Idempotency: only the NULL -> value transition is news. Every later edit of
  -- the row — including a manager re-correcting the bleacher — stays silent.
  if OLD.actual_bleacher_uuid is not null then
    return NEW;
  end if;

  if NEW.actual_bleacher_uuid is null then
    return NEW;
  end if;

  -- Confirming the assigned bleacher is the expected case, not an alert.
  if NEW.actual_bleacher_uuid is not distinct from NEW.bleacher_uuid then
    return NEW;
  end if;

  if NEW.created_by_user_uuid is null then
    return NEW;
  end if;

  -- A manager fixing the bleacher from the web must not be pushed their own
  -- edit. Both apps upload through PostgREST with the acting user's Clerk JWT,
  -- so the writer is identifiable here; a NULL actor (service role, SQL, a
  -- migration) is treated as "not the manager" and still notifies.
  select u.id into actor_id
  from public."Users" u
  where u.clerk_user_id = (auth.jwt() ->> 'sub');

  if actor_id is not null and actor_id = NEW.created_by_user_uuid then
    return NEW;
  end if;

  select b.bleacher_number::text into assigned_number
  from public."Bleachers" b where b.id = NEW.bleacher_uuid;

  select b.bleacher_number::text into actual_number
  from public."Bleachers" b where b.id = NEW.actual_bleacher_uuid;

  insert into public."Notifications" (user_id, title, body)
  values (
    NEW.created_by_user_uuid,
    'Driver took a different bleacher',
    format(
      'Driver took bleacher %s instead of the assigned %s — %s',
      coalesce(actual_number, 'unknown'),
      coalesce(assigned_number, 'unknown'),
      public.bleacher_change_reason_label(NEW.bleacher_change_reason)
    )
  );

  return NEW;
end;
$$;

drop trigger if exists on_bleacher_swap_confirmed on public."WorkTrackers";

create trigger on_bleacher_swap_confirmed
  after update of actual_bleacher_uuid on public."WorkTrackers"
  for each row
  when (OLD.actual_bleacher_uuid is null and NEW.actual_bleacher_uuid is not null)
  execute function public.notify_bleacher_swap();
