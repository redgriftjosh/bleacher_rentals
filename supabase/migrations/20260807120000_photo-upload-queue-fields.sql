

-- ═══════════════════════════════════════════════════════════════
-- 1. InspectionPhotos — had no upload_status at all
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE "InspectionPhotos"
  ADD COLUMN IF NOT EXISTS upload_status    text NOT NULL DEFAULT 'pending',

-- Drivers already have SELECT/INSERT on InspectionPhotos (20260605110000);
-- they now also need UPDATE to advance upload_status / attempts as photos upload
-- (DamageReportPhotos already got its driver UPDATE policy in 20260613100000).
CREATE POLICY "driver_inspection_photos_update"
  ON public."InspectionPhotos"
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (public.get_current_driver_id() IS NOT NULL)
  WITH CHECK (public.get_current_driver_id() IS NOT NULL);

-- ═══════════════════════════════════════════════════════════════
-- 2. DriverDocuments — new table, one row per driver document
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
