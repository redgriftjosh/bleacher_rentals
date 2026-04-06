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

alter table public."BlueBook"
add column if not exists document_path text;


-- Create storage bucket for driver document PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  10485760,  -- 10MB file size limit
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Explicit storage policies scoped to documents bucket
CREATE POLICY "documents: select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "documents: insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "documents: update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "documents: delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

