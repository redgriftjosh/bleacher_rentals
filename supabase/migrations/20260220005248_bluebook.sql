-- ============================================================
-- Migration: bluebook
-- Description: Creates the BlueBook reference documents table
-- ============================================================

CREATE TYPE bluebook_region AS ENUM ('CAN', 'US', 'Both');

CREATE TABLE "BlueBook" (
  -- Primary key
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core fields
  name           TEXT        NOT NULL,
  link           TEXT        NULL,       -- URL to the document/resource
  description    TEXT        NULL,       -- Optional description of the document
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,

  -- Region applicability
  region         bluebook_region NOT NULL DEFAULT 'Both',

  -- sorting fields
  sort_order     INTEGER     NOT NULL DEFAULT 0,       -- controls display order in the app

  -- Audit timestamps
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_bluebook_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bluebook_updated_at
  BEFORE UPDATE ON "BlueBook"
  FOR EACH ROW EXECUTE FUNCTION update_bluebook_updated_at();

-- Enable RLS
alter table public."BlueBook" enable row level security;

create policy "Allow All for Auth"
  on public."BlueBook"
  as permissive
  for all
  to authenticated
using (true);

-- Function to keep timestamps in sync on "BlueBook"
create or replace function public.set_bluebook_timestamps()
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

create trigger set_bluebook_timestamps
before insert or update on public."BlueBook"
for each row
execute function public.set_bluebook_timestamps();
