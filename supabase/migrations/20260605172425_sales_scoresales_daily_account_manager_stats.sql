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

