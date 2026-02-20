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

-- ============================================================
-- Seed Data
-- NOTE: Replace each NULL link with the actual URL when ready.
--       Comments indicate what each link should point to.
-- ============================================================

INSERT INTO "BlueBook" (name, link, description, region, sort_order) VALUES

  (
    'BR Company Information',
    'https://drive.google.com/file/d/1xuha_ryFqpPV3Hoaq89O5g8QgpmzYXGi/view?usp=sharing',
    'General company information and background for BR.',
    'Both',
    10
  ),

  (
    'Truck Requirement',
    'https://drive.google.com/file/d/1QgOxuO6ia_J6FDNQnZtQX37WDH8ZDvMt/view?usp=sharing',
    'Vehicle requirements and specifications drivers must meet.',
    'Both',
    20
  ),

  (
    'Driver Checklist',
    'https://drive.google.com/file/d/1-3FURU_n1yq8ZOYqMAYjz2aKCvfAI034/view?usp=sharing',
    'Checklist of tasks and requirements for drivers.',
    'Both',
    30
  ),

  (
    'Pre/Post Inspections',
    'https://drive.google.com/file/d/10XQ0upb0zjr_I-p79rORZghzg8tky3gg/view?usp=sharing',
    'Instructions and forms for pre- and post-trip vehicle inspections.',
    'Both',
    40
  ),

  (
    'Setup/Teardown Manual',
    'https://drive.google.com/file/d/1x0G-QRoU0iGCXQ2ebXNaidHoEvvjRV8n/view?usp=sharing',
    'Step-by-step guide for equipment setup and teardown.',
    'Both',
    50
  ),

  (
    'Important Legal Documents (CAN)',
    'https://drive.google.com/file/d/1RruJfgcIzBUwaoFV1Wpm68u1xbo9PGp0/view?usp=sharing',
    'Key legal documents required for operations in Canada.',
    'CAN',
    60
  ),

  (
    'Important Legal Documents (USA)',
    'https://drive.google.com/file/d/1sMbzDGrl51lkeOL7FjY8MVChol4PWAs5/view?usp=sharing',
    'Key legal documents required for operations in the United States.',
    'US',
    70
  ),

  (
    'CVOR (CAN)',
    'https://drive.google.com/file/d/1u_QjCs_3euOUDJ3SN1CqbYkJeaTUooam/view?usp=sharing',
    'Commercial Vehicle Operator''s Registration certificate for Canadian operations.',
    'CAN',
    80
  ),

  (
    'Not a Trailer Letter (CAN)',
    'https://drive.google.com/file/d/1hvWmgMFCtpMOb-lmMgANUshKS9_c0YAi/view?usp=sharing',
    'Official letter confirming the vehicle is not classified as a trailer under Canadian regulations.',
    'CAN',
    90
  ),

  (
    'MCMIS (US)',
    'https://drive.google.com/file/d/1keV3CvTvWdm49mY3zQCAyg13gnKMlsfi/view?usp=sharing',
    'Motor Carrier Management Information System record for US operations.',
    'US',
    100
  ),

  (
    'UCR (US)',
    'https://drive.google.com/file/d/1F9GcY0Dk77Lrt23r80hVZG1OGlsGz8KA/view?usp=sharing',
    'Unified Carrier Registration — annual filing required for US interstate operations.',
    'US',
    110
  ),

  (
    'SCAC (US)',
    'https://drive.google.com/file/d/15YhdJ3AZnsSPx6u5AdJg_cf6BWZj1j-7/view?usp=sharing',
    'Standard Carrier Alpha Code — unique identifier required for US carrier operations.',
    'US',
    120
  );