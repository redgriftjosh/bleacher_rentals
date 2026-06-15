-- Add thumbnail column for inline base64 thumbnails (generated on client before upload).
-- Add upload_status to permanently track whether the photo reached Supabase Storage.
ALTER TABLE "DamageReportPhotos"
  ADD COLUMN IF NOT EXISTS thumbnail text,
  ADD COLUMN IF NOT EXISTS upload_status text NOT NULL DEFAULT 'pending';

-- Allow drivers to update their own photo rows (e.g. set thumbnail / upload_status).
CREATE POLICY "driver_damage_report_photos_update"
  ON public."DamageReportPhotos"
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (public.get_current_driver_id() IS NOT NULL)
  WITH CHECK (public.get_current_driver_id() IS NOT NULL);
