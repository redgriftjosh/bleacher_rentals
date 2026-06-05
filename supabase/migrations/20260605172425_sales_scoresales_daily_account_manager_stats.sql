create table public."SalesScorecardDailyAccountManagerStats" (
  id uuid primary key default gen_random_uuid(),

  account_manager_uuid uuid references public."AccountManagers"(id),
  stat_date date not null,

  quotes_sent integer not null default 0,
  quotes_signed_count integer not null default 0,

  quotes_signed_value_cents bigint not null default 0,
  revenue_cents bigint not null default 0,

  driver_pay_cents bigint not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint sales_daily_quotes_sent_nonnegative
    check (quotes_sent >= 0),

  constraint sales_daily_quotes_signed_nonnegative
    check (quotes_signed_count >= 0),

  constraint sales_daily_quotes_signed_value_nonnegative
    check (quotes_signed_value_cents >= 0),

  constraint sales_daily_revenue_nonnegative
    check (revenue_cents >= 0),

  constraint sales_daily_driver_pay_nonnegative
    check (driver_pay_cents >= 0),

  constraint sales_daily_unique_account_manager_date
    unique (account_manager_uuid, stat_date)
);

create index if not exists idx_sales_daily_stats_account_manager_date
  on public."SalesScorecardDailyAccountManagerStats" (
    account_manager_uuid,
    stat_date
  );

create index if not exists idx_sales_daily_stats_date
  on public."SalesScorecardDailyAccountManagerStats" (
    stat_date
  );

alter table public."SalesScorecardDailyAccountManagerStats" enable row level security;

create policy "sales_scorecard_daily_account_manager_stats_select" on public."SalesScorecardDailyAccountManagerStats"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: keep driver_pay_cents in sync with WorkTrackers
-- Fires AFTER INSERT / UPDATE / DELETE on WorkTrackers.
-- Recalculates the aggregate for every (account_manager, date) pair that could
-- have changed: the OLD pair (date + driver's AM before the change) and the
-- NEW pair (date + driver's AM after the change).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function sync_sales_daily_driver_pay()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_am_uuid uuid;
  v_new_am_uuid uuid;
  v_total      bigint;
begin

  -- ── OLD pair (DELETE or UPDATE) ──────────────────────────────────────────
  if tg_op = 'DELETE' or tg_op = 'UPDATE' then
    if OLD.driver_uuid is not null and OLD.date is not null then

      select d.account_manager_uuid into v_old_am_uuid
        from public."Drivers" d
       where d.id = OLD.driver_uuid;

      if v_old_am_uuid is not null then
        select coalesce(sum(wt.pay_cents), 0) into v_total
          from public."WorkTrackers" wt
          join public."Drivers"     d  on d.id = wt.driver_uuid
         where d.account_manager_uuid = v_old_am_uuid
           and wt.date = OLD.date;

        insert into public."SalesScorecardDailyAccountManagerStats"
          (account_manager_uuid, stat_date, driver_pay_cents)
        values
          (v_old_am_uuid, OLD.date, v_total)
        on conflict on constraint sales_daily_unique_account_manager_date
        do update set
          driver_pay_cents = excluded.driver_pay_cents,
          updated_at       = now();
      end if;

    end if;
  end if;

  -- ── NEW pair (INSERT or UPDATE) ──────────────────────────────────────────
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    if NEW.driver_uuid is not null and NEW.date is not null then

      select d.account_manager_uuid into v_new_am_uuid
        from public."Drivers" d
       where d.id = NEW.driver_uuid;

      if v_new_am_uuid is not null then
        -- Skip if same (account_manager, date) was already recalculated above;
        -- on an AFTER trigger the DB already reflects the updated row, so both
        -- queries would return identical results.
        if not (
          tg_op = 'UPDATE'
          and v_new_am_uuid = v_old_am_uuid
          and NEW.date = OLD.date
        ) then
          select coalesce(sum(wt.pay_cents), 0) into v_total
            from public."WorkTrackers" wt
            join public."Drivers"     d  on d.id = wt.driver_uuid
           where d.account_manager_uuid = v_new_am_uuid
             and wt.date = NEW.date;

          insert into public."SalesScorecardDailyAccountManagerStats"
            (account_manager_uuid, stat_date, driver_pay_cents)
          values
            (v_new_am_uuid, NEW.date, v_total)
          on conflict on constraint sales_daily_unique_account_manager_date
          do update set
            driver_pay_cents = excluded.driver_pay_cents,
            updated_at       = now();
        end if;
      end if;

    end if;
  end if;

  if tg_op = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

create trigger trg_sync_sales_daily_driver_pay
after insert or update or delete on public."WorkTrackers"
for each row execute function sync_sales_daily_driver_pay();

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill: populate driver_pay_cents from all existing WorkTrackers rows.
-- Groups by (account_manager_uuid, stat_date) and upserts the totals.
-- ─────────────────────────────────────────────────────────────────────────────
insert into public."SalesScorecardDailyAccountManagerStats"
  (account_manager_uuid, stat_date, driver_pay_cents)
select
  d.account_manager_uuid,
  wt.date                         as stat_date,
  coalesce(sum(wt.pay_cents), 0)  as driver_pay_cents
from public."WorkTrackers" wt
join public."Drivers" d on d.id = wt.driver_uuid
where wt.date is not null
  and d.account_manager_uuid is not null
group by d.account_manager_uuid, wt.date
on conflict on constraint sales_daily_unique_account_manager_date
do update set
  driver_pay_cents = excluded.driver_pay_cents,
  updated_at       = now();

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: keep quotes_sent in sync with Events
-- Fires AFTER INSERT / UPDATE / DELETE on Events.
-- Recalculates the aggregate for every (account_manager, date) pair that could
-- have changed: the OLD pair (AM + created_at date before the change) and the
-- NEW pair (AM + created_at date after the change).
--
-- An event's account manager is resolved via:
--   Events.created_by_user_uuid → AccountManagers.user_uuid
--
-- quotes_sent = count of non-deleted events for that AM on that date.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function sync_sales_daily_quotes_sent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_am_uuid uuid;
  v_old_date    date;
  v_new_am_uuid uuid;
  v_new_date    date;
  v_total       integer;
begin

  -- ── OLD pair (DELETE or UPDATE) ──────────────────────────────────────────
  if tg_op = 'DELETE' or tg_op = 'UPDATE' then
    if OLD.created_by_user_uuid is not null and OLD.created_at is not null then
      v_old_date := (OLD.created_at at time zone 'UTC')::date;

      select am.id into v_old_am_uuid
        from public."AccountManagers" am
       where am.user_uuid = OLD.created_by_user_uuid;

      if v_old_am_uuid is not null then
        select count(*)::integer into v_total
          from public."Events" e
          join public."AccountManagers" am on am.user_uuid = e.created_by_user_uuid
         where am.id = v_old_am_uuid
           and (e.created_at at time zone 'UTC')::date = v_old_date
           and e.deleted = false;

        insert into public."SalesScorecardDailyAccountManagerStats"
          (account_manager_uuid, stat_date, quotes_sent)
        values
          (v_old_am_uuid, v_old_date, v_total)
        on conflict on constraint sales_daily_unique_account_manager_date
        do update set
          quotes_sent = excluded.quotes_sent,
          updated_at  = now();
      end if;

    end if;
  end if;

  -- ── NEW pair (INSERT or UPDATE) ──────────────────────────────────────────
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    if NEW.created_by_user_uuid is not null and NEW.created_at is not null then
      v_new_date := (NEW.created_at at time zone 'UTC')::date;

      select am.id into v_new_am_uuid
        from public."AccountManagers" am
       where am.user_uuid = NEW.created_by_user_uuid;

      if v_new_am_uuid is not null then
        if not (
          tg_op = 'UPDATE'
          and v_new_am_uuid = v_old_am_uuid
          and v_new_date = v_old_date
        ) then
          select count(*)::integer into v_total
            from public."Events" e
            join public."AccountManagers" am on am.user_uuid = e.created_by_user_uuid
           where am.id = v_new_am_uuid
             and (e.created_at at time zone 'UTC')::date = v_new_date
             and e.deleted = false;

          insert into public."SalesScorecardDailyAccountManagerStats"
            (account_manager_uuid, stat_date, quotes_sent)
          values
            (v_new_am_uuid, v_new_date, v_total)
          on conflict on constraint sales_daily_unique_account_manager_date
          do update set
            quotes_sent = excluded.quotes_sent,
            updated_at  = now();
        end if;
      end if;

    end if;
  end if;

  if tg_op = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

create trigger trg_sync_sales_daily_quotes_sent
after insert or update or delete on public."Events"
for each row execute function sync_sales_daily_quotes_sent();

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill: populate quotes_sent from all existing Events rows.
-- Groups by (account_manager_uuid, stat_date) and upserts the counts.
-- ─────────────────────────────────────────────────────────────────────────────
insert into public."SalesScorecardDailyAccountManagerStats"
  (account_manager_uuid, stat_date, quotes_sent)
select
  am.id                                        as account_manager_uuid,
  (e.created_at at time zone 'UTC')::date      as stat_date,
  count(*)::integer                             as quotes_sent
from public."Events" e
join public."AccountManagers" am on am.user_uuid = e.created_by_user_uuid
where e.created_at is not null
  and e.deleted = false
group by am.id, (e.created_at at time zone 'UTC')::date
on conflict on constraint sales_daily_unique_account_manager_date
do update set
  quotes_sent = excluded.quotes_sent,
  updated_at  = now();

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: keep quotes_signed_count in sync with Events
-- Fires AFTER INSERT / UPDATE / DELETE on Events.
-- Recalculates the aggregate for every (account_manager, date) pair that could
-- have changed: the OLD pair (AM + booked_at date before the change) and the
-- NEW pair (AM + booked_at date after the change).
--
-- quotes_signed_count = count of non-deleted, booked events for that AM on
-- that booked_at date.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function sync_sales_daily_quotes_signed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_am_uuid uuid;
  v_old_date    date;
  v_new_am_uuid uuid;
  v_new_date    date;
  v_total       integer;
begin

  -- ── OLD pair (DELETE or UPDATE) ──────────────────────────────────────────
  if tg_op = 'DELETE' or tg_op = 'UPDATE' then
    if OLD.created_by_user_uuid is not null and OLD.booked_at is not null then
      v_old_date := (OLD.booked_at at time zone 'UTC')::date;

      select am.id into v_old_am_uuid
        from public."AccountManagers" am
       where am.user_uuid = OLD.created_by_user_uuid;

      if v_old_am_uuid is not null then
        select count(*)::integer into v_total
          from public."Events" e
          join public."AccountManagers" am on am.user_uuid = e.created_by_user_uuid
         where am.id = v_old_am_uuid
           and (e.booked_at at time zone 'UTC')::date = v_old_date
           and e.deleted = false
           and e.booked_at is not null;

        insert into public."SalesScorecardDailyAccountManagerStats"
          (account_manager_uuid, stat_date, quotes_signed_count)
        values
          (v_old_am_uuid, v_old_date, v_total)
        on conflict on constraint sales_daily_unique_account_manager_date
        do update set
          quotes_signed_count = excluded.quotes_signed_count,
          updated_at          = now();
      end if;

    end if;
  end if;

  -- ── NEW pair (INSERT or UPDATE) ──────────────────────────────────────────
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    if NEW.created_by_user_uuid is not null and NEW.booked_at is not null then
      v_new_date := (NEW.booked_at at time zone 'UTC')::date;

      select am.id into v_new_am_uuid
        from public."AccountManagers" am
       where am.user_uuid = NEW.created_by_user_uuid;

      if v_new_am_uuid is not null then
        if not (
          tg_op = 'UPDATE'
          and v_new_am_uuid = v_old_am_uuid
          and v_new_date = v_old_date
        ) then
          select count(*)::integer into v_total
            from public."Events" e
            join public."AccountManagers" am on am.user_uuid = e.created_by_user_uuid
           where am.id = v_new_am_uuid
             and (e.booked_at at time zone 'UTC')::date = v_new_date
             and e.deleted = false
             and e.booked_at is not null;

          insert into public."SalesScorecardDailyAccountManagerStats"
            (account_manager_uuid, stat_date, quotes_signed_count)
          values
            (v_new_am_uuid, v_new_date, v_total)
          on conflict on constraint sales_daily_unique_account_manager_date
          do update set
            quotes_signed_count = excluded.quotes_signed_count,
            updated_at          = now();
        end if;
      end if;

    end if;
  end if;

  if tg_op = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

create trigger trg_sync_sales_daily_quotes_signed
after insert or update or delete on public."Events"
for each row execute function sync_sales_daily_quotes_signed();

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill: populate quotes_signed_count from all existing Events rows.
-- Groups by (account_manager_uuid, booked_at date) and upserts the counts.
-- ─────────────────────────────────────────────────────────────────────────────
insert into public."SalesScorecardDailyAccountManagerStats"
  (account_manager_uuid, stat_date, quotes_signed_count)
select
  am.id                                        as account_manager_uuid,
  (e.booked_at at time zone 'UTC')::date       as stat_date,
  count(*)::integer                             as quotes_signed_count
from public."Events" e
join public."AccountManagers" am on am.user_uuid = e.created_by_user_uuid
where e.booked_at is not null
  and e.deleted = false
group by am.id, (e.booked_at at time zone 'UTC')::date
on conflict on constraint sales_daily_unique_account_manager_date
do update set
  quotes_signed_count = excluded.quotes_signed_count,
  updated_at          = now();

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: keep quotes_signed_value_cents in sync with Events
-- Fires AFTER INSERT / UPDATE / DELETE on Events.
-- Same (AM, booked_at date) pair logic as quotes_signed_count, but sums
-- contract_revenue_cents instead of counting rows.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function sync_sales_daily_quotes_signed_value()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_am_uuid uuid;
  v_old_date    date;
  v_new_am_uuid uuid;
  v_new_date    date;
  v_total       bigint;
begin

  -- ── OLD pair (DELETE or UPDATE) ──────────────────────────────────────────
  if tg_op = 'DELETE' or tg_op = 'UPDATE' then
    if OLD.created_by_user_uuid is not null and OLD.booked_at is not null then
      v_old_date := (OLD.booked_at at time zone 'UTC')::date;

      select am.id into v_old_am_uuid
        from public."AccountManagers" am
       where am.user_uuid = OLD.created_by_user_uuid;

      if v_old_am_uuid is not null then
        select coalesce(sum(e.contract_revenue_cents), 0) into v_total
          from public."Events" e
          join public."AccountManagers" am on am.user_uuid = e.created_by_user_uuid
         where am.id = v_old_am_uuid
           and (e.booked_at at time zone 'UTC')::date = v_old_date
           and e.deleted = false
           and e.booked_at is not null;

        insert into public."SalesScorecardDailyAccountManagerStats"
          (account_manager_uuid, stat_date, quotes_signed_value_cents)
        values
          (v_old_am_uuid, v_old_date, v_total)
        on conflict on constraint sales_daily_unique_account_manager_date
        do update set
          quotes_signed_value_cents = excluded.quotes_signed_value_cents,
          updated_at                = now();
      end if;

    end if;
  end if;

  -- ── NEW pair (INSERT or UPDATE) ──────────────────────────────────────────
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    if NEW.created_by_user_uuid is not null and NEW.booked_at is not null then
      v_new_date := (NEW.booked_at at time zone 'UTC')::date;

      select am.id into v_new_am_uuid
        from public."AccountManagers" am
       where am.user_uuid = NEW.created_by_user_uuid;

      if v_new_am_uuid is not null then
        if not (
          tg_op = 'UPDATE'
          and v_new_am_uuid = v_old_am_uuid
          and v_new_date = v_old_date
        ) then
          select coalesce(sum(e.contract_revenue_cents), 0) into v_total
            from public."Events" e
            join public."AccountManagers" am on am.user_uuid = e.created_by_user_uuid
           where am.id = v_new_am_uuid
             and (e.booked_at at time zone 'UTC')::date = v_new_date
             and e.deleted = false
             and e.booked_at is not null;

          insert into public."SalesScorecardDailyAccountManagerStats"
            (account_manager_uuid, stat_date, quotes_signed_value_cents)
          values
            (v_new_am_uuid, v_new_date, v_total)
          on conflict on constraint sales_daily_unique_account_manager_date
          do update set
            quotes_signed_value_cents = excluded.quotes_signed_value_cents,
            updated_at                = now();
        end if;
      end if;

    end if;
  end if;

  if tg_op = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

create trigger trg_sync_sales_daily_quotes_signed_value
after insert or update or delete on public."Events"
for each row execute function sync_sales_daily_quotes_signed_value();

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill: populate quotes_signed_value_cents from all existing Events rows.
-- Groups by (account_manager_uuid, booked_at date) and upserts the sums.
-- ─────────────────────────────────────────────────────────────────────────────
insert into public."SalesScorecardDailyAccountManagerStats"
  (account_manager_uuid, stat_date, quotes_signed_value_cents)
select
  am.id                                                  as account_manager_uuid,
  (e.booked_at at time zone 'UTC')::date                 as stat_date,
  coalesce(sum(e.contract_revenue_cents), 0)              as quotes_signed_value_cents
from public."Events" e
join public."AccountManagers" am on am.user_uuid = e.created_by_user_uuid
where e.booked_at is not null
  and e.deleted = false
group by am.id, (e.booked_at at time zone 'UTC')::date
on conflict on constraint sales_daily_unique_account_manager_date
do update set
  quotes_signed_value_cents = excluded.quotes_signed_value_cents,
  updated_at                = now();

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: keep revenue_cents in sync with Events
-- Fires AFTER INSERT / UPDATE / DELETE on Events.
-- Same (AM, date) pair logic but uses event_start (which is already a date,
-- not timestamptz) and sums contract_revenue_cents for booked, non-deleted
-- events.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function sync_sales_daily_revenue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_am_uuid uuid;
  v_old_date    date;
  v_new_am_uuid uuid;
  v_new_date    date;
  v_total       bigint;
begin

  -- ── OLD pair (DELETE or UPDATE) ──────────────────────────────────────────
  if tg_op = 'DELETE' or tg_op = 'UPDATE' then
    if OLD.created_by_user_uuid is not null and OLD.event_start is not null then
      v_old_date := OLD.event_start;

      select am.id into v_old_am_uuid
        from public."AccountManagers" am
       where am.user_uuid = OLD.created_by_user_uuid;

      if v_old_am_uuid is not null then
        select coalesce(sum(e.contract_revenue_cents), 0) into v_total
          from public."Events" e
          join public."AccountManagers" am on am.user_uuid = e.created_by_user_uuid
         where am.id = v_old_am_uuid
           and e.event_start = v_old_date
           and e.deleted = false
           and e.booked_at is not null;

        insert into public."SalesScorecardDailyAccountManagerStats"
          (account_manager_uuid, stat_date, revenue_cents)
        values
          (v_old_am_uuid, v_old_date, v_total)
        on conflict on constraint sales_daily_unique_account_manager_date
        do update set
          revenue_cents = excluded.revenue_cents,
          updated_at    = now();
      end if;

    end if;
  end if;

  -- ── NEW pair (INSERT or UPDATE) ──────────────────────────────────────────
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    if NEW.created_by_user_uuid is not null and NEW.event_start is not null then
      v_new_date := NEW.event_start;

      select am.id into v_new_am_uuid
        from public."AccountManagers" am
       where am.user_uuid = NEW.created_by_user_uuid;

      if v_new_am_uuid is not null then
        if not (
          tg_op = 'UPDATE'
          and v_new_am_uuid = v_old_am_uuid
          and v_new_date = v_old_date
        ) then
          select coalesce(sum(e.contract_revenue_cents), 0) into v_total
            from public."Events" e
            join public."AccountManagers" am on am.user_uuid = e.created_by_user_uuid
           where am.id = v_new_am_uuid
             and e.event_start = v_new_date
             and e.deleted = false
             and e.booked_at is not null;

          insert into public."SalesScorecardDailyAccountManagerStats"
            (account_manager_uuid, stat_date, revenue_cents)
          values
            (v_new_am_uuid, v_new_date, v_total)
          on conflict on constraint sales_daily_unique_account_manager_date
          do update set
            revenue_cents = excluded.revenue_cents,
            updated_at    = now();
        end if;
      end if;

    end if;
  end if;

  if tg_op = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

create trigger trg_sync_sales_daily_revenue
after insert or update or delete on public."Events"
for each row execute function sync_sales_daily_revenue();

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill: populate revenue_cents from all existing Events rows.
-- Groups by (account_manager_uuid, event_start) and upserts the sums.
-- ─────────────────────────────────────────────────────────────────────────────
insert into public."SalesScorecardDailyAccountManagerStats"
  (account_manager_uuid, stat_date, revenue_cents)
select
  am.id                                        as account_manager_uuid,
  e.event_start                                as stat_date,
  coalesce(sum(e.contract_revenue_cents), 0)   as revenue_cents
from public."Events" e
join public."AccountManagers" am on am.user_uuid = e.created_by_user_uuid
where e.event_start is not null
  and e.deleted = false
  and e.booked_at is not null
group by am.id, e.event_start
on conflict on constraint sales_daily_unique_account_manager_date
do update set
  revenue_cents = excluded.revenue_cents,
  updated_at    = now();

