-- ============================================================================
-- Direct Line to Developers — drivers file their own backlog tickets.
--
-- `RoadmapTasks` has been the developers' board: RBAC admits admin, developer,
-- account_manager and viewer, and a driver had no policy on it at all. This
-- adds a narrow self-service lane on top of those policies (permissive, so
-- nothing existing changes): a driver may read their own backlog rows, insert
-- one, and correct or withdraw it for a while afterwards. Everything else on
-- the table stays exactly as restricted as it was.
--
-- WHY THE SERVER WINDOW IS 48 HOURS WHILE THE APP SAYS 24
--
-- The driver app is offline-first. An edit made at 23h59m on a phone with no
-- signal can reach Postgres days later, and a policy measured against the
-- server clock would reject it on arrival. PowerSync classifies an RLS refusal
-- (42501) and a constraint violation (23xxx) as FATAL and DROPS the operation
-- from its upload queue — the driver is never told, and the edit is simply
-- gone. So every rule here is deliberately looser than the rule the UI
-- enforces, with one exception: the daily limit, which is identical on both
-- sides by explicit product decision. See the note on the trigger.
--
-- WHY created_at IS TRUSTED FROM THE CLIENT
--
-- The app writes `created_at` itself instead of taking the column default: the
-- default would stamp the moment of *sync*, so a ticket filed in a dead zone
-- would reset its own edit window and its own daily slot on reconnect. The
-- price is that both windows are measured against a clock the server does not
-- own. That is the right trade here — the blast radius of a wrong device clock
-- is one driver filing a fourth low-stakes ticket.
-- ============================================================================

-- ── Driver self-service policies ────────────────────────────────────────────
-- Permissive and additive: they OR with the existing rbac_* policies.

drop policy if exists "driver_backlog_select" on public."RoadmapTasks";
create policy "driver_backlog_select" on public."RoadmapTasks"
  as permissive for select to authenticated
  using (
    is_backlog
    and created_by_user_uuid = public.get_current_user_uuid()
  );

-- The insert shape is pinned here rather than left to the app: a driver may
-- only ever add an unranked backlog item attributed to themselves. Sprint,
-- feature, assignee and completion are the web roadmap's to set.
drop policy if exists "driver_backlog_insert" on public."RoadmapTasks";
create policy "driver_backlog_insert" on public."RoadmapTasks"
  as permissive for insert to authenticated
  with check (
    public.get_current_driver_id() is not null
    and is_backlog
    and status = 'to_do'
    and created_by_user_uuid = public.get_current_user_uuid()
    and sprint_id is null
    and feature_id is null
    and developer_uuid is null
    and completed_at is null
  );

-- USING bounds *which* rows a driver may touch and for how long. WITH CHECK
-- deliberately does NOT re-assert `status`: a developer may well have moved the
-- ticket to in_progress before the driver's queued edit arrives, and a
-- rejection at that point is a silently dropped write. Which columns a driver
-- may actually change is enforced by the trigger below, where OLD is available
-- and the refusal can be specific.
drop policy if exists "driver_backlog_update" on public."RoadmapTasks";
create policy "driver_backlog_update" on public."RoadmapTasks"
  as permissive for update to authenticated
  using (
    is_backlog
    and created_by_user_uuid = public.get_current_user_uuid()
    and created_at > now() - interval '48 hours'
  )
  with check (
    is_backlog
    and created_by_user_uuid = public.get_current_user_uuid()
  );

-- No delete policy, on purpose: withdrawal is `deleted_at`, never a DELETE.
-- The row is the team's record of what was reported, and the daily limit below
-- counts rows created — withdrawn ones included.

-- ── Guard trigger ───────────────────────────────────────────────────────────

create or replace function public.enforce_driver_backlog_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count int;
begin
  -- Only drivers are constrained. Anyone on the roadmap side of the product
  -- (admin, developer, account manager) manages this table exactly as before.
  if public.get_user_roles() && '{admin,developer,account_manager}'::text[] then
    return new;
  end if;

  if public.get_current_driver_id() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Three tickets per rolling 24 hours, counted over rows CREATED —
    -- including ones the driver has since withdrawn. The app enforces the same
    -- number with the same counting rule (features/backlog-tickets/utils/
    -- dailyTicketLimit.ts in br_driver), and soft-deleted rows keep syncing to
    -- the device precisely so that it can. Keep the two in step: if this limit
    -- is ever tightened without the client following, the extra write is not
    -- refused in the UI, it is dropped from the upload queue in silence.
    select count(*) into recent_count
    from public."RoadmapTasks" t
    where t.created_by_user_uuid = new.created_by_user_uuid
      and t.is_backlog
      and t.created_at > now() - interval '24 hours';

    if recent_count >= 3 then
      raise exception
        'Backlog ticket limit reached: a driver may file 3 tickets per 24 hours'
        using errcode = 'check_violation';
    end if;

    return new;
  end if;

  -- UPDATE: a driver may rewrite their own words or withdraw the ticket, and
  -- nothing else. Every other column must arrive unchanged — `created_at`
  -- included, since both windows are measured from it.
  if new.status is distinct from old.status
    or new.sort_order is distinct from old.sort_order
    or new.is_backlog is distinct from old.is_backlog
    or new.created_by_user_uuid is distinct from old.created_by_user_uuid
    or new.created_at is distinct from old.created_at
    or new.sprint_id is distinct from old.sprint_id
    or new.feature_id is distinct from old.feature_id
    or new.developer_uuid is distinct from old.developer_uuid
    or new.completed_at is distinct from old.completed_at
  then
    raise exception
      'A driver may only edit the title, description or deleted_at of their own backlog ticket'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_driver_backlog_ticket on public."RoadmapTasks";
create trigger enforce_driver_backlog_ticket
  before insert or update on public."RoadmapTasks"
  for each row
  execute function public.enforce_driver_backlog_ticket();

comment on function public.enforce_driver_backlog_ticket() is
  'Driver-only guard on RoadmapTasks: 3 backlog tickets per rolling 24h (counted '
  'over rows created, withdrawn ones included, matching the mobile client exactly) '
  'and, on update, title/description/deleted_at as the only changeable columns. '
  'Roadmap-side roles are exempt and pass straight through.';
