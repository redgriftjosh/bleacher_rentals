-- =============================================================
-- Custom photo upload queue — schema support
--
-- Design doc (br_driver repo): docs/custom-photo-upload-queue.md §3.
--
-- Replaces the deprecated @powersync/attachments queue, whose "recompute which
-- photos are still needed" pass could archive + delete a photo before it ever
-- reached Storage. The queue state now lives entirely on the photo row itself
-- (upload_status + bookkeeping columns), changed only by the upload logic —
-- nothing recomputes a photo's "neededness" from a JOIN.
--
-- Adds, to every photo-bearing table:
--   local_uri         current on-device file URI (gallery / cache copy)
--   gallery_asset_id  MediaLibrary asset id, for re-access
--   attempts          failed-attempt counter, drives backoff (never "give up")
--   last_attempt_at   timestamp of the last attempt
--   last_error        last error text (support diagnostics, visible server-side)
-- InspectionPhotos additionally gains upload_status (it had none).
-- DriverDocuments is a new table: one row per driver document, same shape.
-- =============================================================

-- ═══════════════════════════════════════════════════════════════
-- 1. DamageReportPhotos — already has photo_path + upload_status
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE "DamageReportPhotos"
  ADD COLUMN IF NOT EXISTS local_uri        text,
  ADD COLUMN IF NOT EXISTS gallery_asset_id text,
  ADD COLUMN IF NOT EXISTS attempts         integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at  timestamptz,
  ADD COLUMN IF NOT EXISTS last_error       text;

-- ═══════════════════════════════════════════════════════════════
-- 2. InspectionPhotos — had no upload_status at all
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE "InspectionPhotos"
  ADD COLUMN IF NOT EXISTS upload_status    text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS local_uri        text,
  ADD COLUMN IF NOT EXISTS gallery_asset_id text,
  ADD COLUMN IF NOT EXISTS attempts         integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at  timestamptz,
  ADD COLUMN IF NOT EXISTS last_error       text;

-- Drivers already have SELECT/INSERT on InspectionPhotos (20260605110000);
-- they now also need UPDATE to advance upload_status / attempts as photos upload
-- (DamageReportPhotos already got its driver UPDATE policy in 20260613100000).
CREATE POLICY "driver_inspection_photos_update"
  ON public."InspectionPhotos"
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (public.get_current_driver_id() IS NOT NULL)
  WITH CHECK (public.get_current_driver_id() IS NOT NULL);

-- ═══════════════════════════════════════════════════════════════
-- 3. DriverDocuments — new table, one row per driver document
--
-- Supersedes Drivers.{license,insurance,medical_card}_photo_path as the source
-- of truth (those columns become derived, read by doc_type). Same queue shape
-- as the photo tables so one worker/verifier/banner covers all three sources.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public."DriverDocuments" (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_uuid       UUID NOT NULL REFERENCES public."Drivers"(id) ON DELETE CASCADE,
  doc_type          TEXT NOT NULL CHECK (doc_type IN ('license', 'insurance', 'medical_card')),
  photo_path        TEXT NOT NULL,
  upload_status     TEXT NOT NULL DEFAULT 'pending',
  local_uri         TEXT,
  gallery_asset_id  TEXT,
  attempts          INTEGER NOT NULL DEFAULT 0,
  last_attempt_at   TIMESTAMPTZ,
  last_error        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One current row per document per driver.
  CONSTRAINT "DriverDocuments_driver_doc_type_key" UNIQUE (driver_uuid, doc_type)
);

CREATE INDEX IF NOT EXISTS "DriverDocuments_driver_uuid_idx"
  ON public."DriverDocuments" (driver_uuid);

ALTER TABLE public."DriverDocuments" ENABLE ROW LEVEL SECURITY;

-- Back-office RBAC. The 20260513 role-accessibility loop only ran over tables
-- that existed then, so a table created later must declare its own admin
-- policies (mirrors what that loop grants: admin full CRUD).
CREATE POLICY "rbac_select" ON public."DriverDocuments"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.get_user_roles() && '{admin}'::text[]);

CREATE POLICY "rbac_insert" ON public."DriverDocuments"
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (public.get_user_roles() && '{admin}'::text[]);

CREATE POLICY "rbac_update" ON public."DriverDocuments"
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (public.get_user_roles() && '{admin}'::text[]);

CREATE POLICY "rbac_delete" ON public."DriverDocuments"
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (public.get_user_roles() && '{admin}'::text[]);

-- Driver self-service: a driver reads and manages only their own document rows.
CREATE POLICY "driver_documents_select"
  ON public."DriverDocuments"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    public.get_current_driver_id() IS NOT NULL
    AND driver_uuid = public.get_current_driver_id()
  );

CREATE POLICY "driver_documents_insert"
  ON public."DriverDocuments"
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    public.get_current_driver_id() IS NOT NULL
    AND driver_uuid = public.get_current_driver_id()
  );

CREATE POLICY "driver_documents_update"
  ON public."DriverDocuments"
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    public.get_current_driver_id() IS NOT NULL
    AND driver_uuid = public.get_current_driver_id()
  )
  WITH CHECK (
    public.get_current_driver_id() IS NOT NULL
    AND driver_uuid = public.get_current_driver_id()
  );

CREATE POLICY "driver_documents_delete"
  ON public."DriverDocuments"
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    public.get_current_driver_id() IS NOT NULL
    AND driver_uuid = public.get_current_driver_id()
  );
