-- Add invoice_number column to Events (9-digit integer, unique, nullable for old events)
alter table public."Events"
  add column invoice_number bigint null;

-- Create unique index
create unique index "Events_invoice_number_key"
  on public."Events" (invoice_number)
  where invoice_number is not null;

-- Helper function: generate a random 9-digit invoice number that doesn't collide
create or replace function public.generate_invoice_number()
returns bigint
language plpgsql
as $$
declare
  candidate bigint;
begin
  loop
    candidate := floor(random() * 900000000 + 100000000)::bigint;
    if not exists (
      select 1 from public."Events" where invoice_number = candidate
    ) then
      return candidate;
    end if;
  end loop;
end;
$$;
