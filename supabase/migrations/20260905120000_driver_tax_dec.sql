-- ============================================================================
-- Driver tax rate as a decimal.
--
-- Quebec charges 14.975 %, and other provinces and states produce fractional
-- rates too. `Drivers.tax` is an integer, so every one of them was truncated
-- and every payout computed from it was wrong.
--
-- `tax` cannot change type: shipped builds of the driver app still read it. So
-- it stays as a deprecated whole-percent mirror, kept honest by a trigger.
-- ============================================================================

alter table public."Drivers"
  add column if not exists tax_dec numeric(6,3) not null default 0;

-- Back-fill from the integer column. The guard keeps the migration re-runnable
-- and never overwrites a decimal rate that is already there.
update public."Drivers"
   set tax_dec = tax
 where tax_dec = 0
   and tax <> 0;

comment on column public."Drivers".tax_dec is
  'Driver tax rate in percent, 3 decimals (e.g. 14.975 for Quebec).';

comment on column public."Drivers".tax is
  'DEPRECATED - whole-percent mirror of tax_dec, kept for shipped br_driver builds. Maintained by sync_driver_tax(); write tax_dec instead.';

-- ----------------------------------------------------------------------------
-- Keep the pair consistent whichever side is written.
--
-- New code writes tax_dec and the rounded whole percent follows. An old client
-- - or a hand-written SQL update - writes tax, and tax_dec follows instead, so
-- the deprecated column can never quietly become the only true value.
-- ----------------------------------------------------------------------------
create or replace function public.sync_driver_tax()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.tax_dec is distinct from 0 then
      NEW.tax := round(NEW.tax_dec)::int;
    elsif NEW.tax is distinct from 0 then
      NEW.tax_dec := NEW.tax;
    end if;
    return NEW;
  end if;

  if NEW.tax_dec is distinct from OLD.tax_dec then
    NEW.tax := round(NEW.tax_dec)::int;
  elsif NEW.tax is distinct from OLD.tax then
    NEW.tax_dec := NEW.tax;
  end if;

  return NEW;
end;
$$;

drop trigger if exists sync_driver_tax on public."Drivers";
create trigger sync_driver_tax
  before insert or update on public."Drivers"
  for each row
  execute function public.sync_driver_tax();
