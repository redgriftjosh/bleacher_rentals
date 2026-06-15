-- EventFiles table for quote/booking file attachments
CREATE TABLE IF NOT EXISTS "EventFiles" (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_uuid      uuid NOT NULL REFERENCES "Events"(id) ON DELETE CASCADE,
  file_name       text NOT NULL,
  storage_path    text NOT NULL,
  mime_type       text,
  file_size_bytes bigint,
  source          text NOT NULL DEFAULT 'upload',
  uploaded_by     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_files_event_uuid ON "EventFiles"(event_uuid);

ALTER TABLE "EventFiles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "EventFiles: select"
ON "EventFiles" FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "EventFiles: insert"
ON "EventFiles" FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "EventFiles: delete"
ON "EventFiles" FOR DELETE
TO authenticated
USING (true);

-- Private storage bucket for event files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-files',
  'event-files',
  false,
  20971520,  -- 20MB
  ARRAY[
    'application/pdf',
    'image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for event-files bucket
CREATE POLICY "event-files: select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'event-files');

CREATE POLICY "event-files: insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-files');

CREATE POLICY "event-files: delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-files');
