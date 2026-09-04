-- ============================================================================
-- Work tracker line item quantity as a decimal.
--
-- Work does not arrive in whole units: half a day of setup, 2.5 hours of
-- maintenance, 1.5 loads of deadhead. `WorkTrackerLineItems.quantity` is an
-- integer, so every one of those had to be rounded by hand and the pay computed
-- from it was wrong by up to half a unit times the rate.
--
-- `quantity` cannot change type: shipped builds of the driver app still read it
-- to render the pay breakdown. So it stays as a deprecated whole-unit mirror,
-- kept honest by a trigger. Same shape as Drivers.tax_dec / sync_driver_tax().
-- ============================================================================

alter table public."WorkTrackerLineItems"
  add column if not exists qty_decimal numeric(10,1) not null default 1;

-- Back-fill from the integer column. The guard keeps the migration re-runnable
-- and never overwrites a decimal quantity that is already there. `1` is the
-- default both columns carry, so a row still sitting on it needs nothing.
update public."WorkTrackerLineItems"
   set qty_decimal = quantity
 where qty_decimal = 1
   and quantity <> 1;

do $$
begin
  alter table public."WorkTrackerLineItems"
    add constraint work_tracker_line_items_qty_decimal_check check (qty_decimal >= 0);
exception when duplicate_object then null;
end $$;

comment on column public."WorkTrackerLineItems".qty_decimal is
  'Line quantity, 1 decimal (e.g. 2.5 hours). The real quantity.';

comment on column public."WorkTrackerLineItems".quantity is
  'DEPRECATED - whole-unit mirror of qty_decimal, kept for shipped br_driver builds. Maintained by sync_work_tracker_line_item_qty(); write qty_decimal instead.';

-- ----------------------------------------------------------------------------
-- Keep the pair consistent whichever side is written.
--
-- New code writes qty_decimal and the rounded whole unit follows. An old client
-- - or a hand-written SQL update - writes quantity, and qty_decimal follows
-- instead, so the deprecated column can never quietly become the only true
-- value.
-- ----------------------------------------------------------------------------
create or replace function public.sync_work_tracker_line_item_qty()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    -- Both columns default to 1. Whichever one the caller actually named wins;
    -- if neither did, they already agree and there is nothing to do.
    if NEW.qty_decimal is distinct from 1 then
      NEW.quantity := round(NEW.qty_decimal)::int;
    elsif NEW.quantity is distinct from 1 then
      NEW.qty_decimal := NEW.quantity;
    end if;
    return NEW;
  end if;

  if NEW.qty_decimal is distinct from OLD.qty_decimal then
    NEW.quantity := round(NEW.qty_decimal)::int;
  elsif NEW.quantity is distinct from OLD.quantity then
    NEW.qty_decimal := NEW.quantity;
  end if;

  return NEW;
end;
$$;

drop trigger if exists sync_work_tracker_line_item_qty on public."WorkTrackerLineItems";
create trigger sync_work_tracker_line_item_qty
  before insert or update on public."WorkTrackerLineItems"
  for each row
  execute function public.sync_work_tracker_line_item_qty();
