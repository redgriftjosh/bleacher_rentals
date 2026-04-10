-- Add nvis_pdf_path column to Bleachers table
ALTER TABLE public."Bleachers"
    ADD COLUMN nvis_pdf_path text;

-- Create storage bucket for bleacher NVIS PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bleacher-nvis',
  'bleacher-nvis',
  true,
  10485760,  -- 10MB file size limit
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Explicit storage policies scoped to bleacher-nvis bucket
CREATE POLICY "bleacher-nvis: select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'bleacher-nvis');

CREATE POLICY "bleacher-nvis: insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bleacher-nvis');

CREATE POLICY "bleacher-nvis: update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'bleacher-nvis');

CREATE POLICY "bleacher-nvis: delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'bleacher-nvis');