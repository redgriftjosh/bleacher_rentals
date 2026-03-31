CREATE TABLE "DriverUnavailability" (
  -- Primary key
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core fields
  driver_uuid    UUID        REFERENCES public."Drivers"(id) ON DELETE SET NULL,
  date_unavailable DATE        NOT NULL,

  -- Audit timestamps
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_driver_unavailability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_driver_unavailability_updated_at
  BEFORE UPDATE ON "DriverUnavailability"
  FOR EACH ROW EXECUTE FUNCTION update_driver_unavailability_updated_at();

-- Enable RLS
alter table public."DriverUnavailability" enable row level security;

create policy "Allow All for Auth"
  on public."DriverUnavailability"
  as permissive
  for all
  to authenticated
using (true);

-- Function to keep timestamps in sync on "DriverUnavailability"
create or replace function public.set_driver_unavailability_timestamps()
returns trigger
language plpgsql
as $$
begin
  if (TG_OP = 'INSERT') then
    new.created_at := now();
    new.updated_at := now();
  elsif (TG_OP = 'UPDATE') then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger set_driver_unavailability_timestamps
before insert or update on public."DriverUnavailability"
for each row
execute function public.set_driver_unavailability_timestamps();
