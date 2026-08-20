-- DriverDocuments backfill
--
-- 20260815120000 introduced DriverDocuments but only ever gets a row written
-- into it when a driver saves a document through the app's upload queue
-- (EditProfileDocs.tsx). Every driver whose license/insurance/medical_card
-- photo was set before that date — or by an admin, directly on Drivers —
-- still has a legacy Drivers.<doc>_photo_path with no matching DriverDocuments
-- row, so the profile's upload-status lookup (useDriverDocUploadStatuses,
-- keyed by DriverDocuments) sees nothing for them. That's harmless today
-- ("unknown" status still reads as ready — see isDocPathReady), but leaves
-- these documents outside the queue's bookkeeping.
--
-- This grandfathers them in, one row per (driver, doc_type) that Drivers
-- already has a photo for. Deliberately upload_status = 'uploaded': these
-- paths are already live in production and were never queued client-side, so
-- there is no real upload attempt to reconstruct, and nothing should
-- re-trigger a re-upload for them (UNRESOLVED_STATUSES in tableAdapters.ts is
-- only 'pending'/'failed' — 'uploaded' rows are untouched by the queue).
--
-- Idempotent: ON CONFLICT (driver_uuid, doc_type) DO NOTHING, so re-running
-- this only fills in gaps and never overwrites a row a driver has since
-- replaced through the app.

INSERT INTO public."DriverDocuments"
  (id, driver_uuid, doc_type, photo_path, upload_status, gallery_asset_id, attempts, last_attempt_at, last_error, created_at)
SELECT
  gen_random_uuid(),
  d.id,
  'license',
  d.license_photo_path,
  'uploaded',
  NULL,
  0,
  NULL,
  NULL,
  now()
FROM public."Drivers" d
WHERE d.license_photo_path IS NOT NULL
  AND btrim(d.license_photo_path) <> ''
ON CONFLICT (driver_uuid, doc_type) DO NOTHING;

INSERT INTO public."DriverDocuments"
  (id, driver_uuid, doc_type, photo_path, upload_status, gallery_asset_id, attempts, last_attempt_at, last_error, created_at)
SELECT
  gen_random_uuid(),
  d.id,
  'insurance',
  d.insurance_photo_path,
  'uploaded',
  NULL,
  0,
  NULL,
  NULL,
  now()
FROM public."Drivers" d
WHERE d.insurance_photo_path IS NOT NULL
  AND btrim(d.insurance_photo_path) <> ''
ON CONFLICT (driver_uuid, doc_type) DO NOTHING;

INSERT INTO public."DriverDocuments"
  (id, driver_uuid, doc_type, photo_path, upload_status, gallery_asset_id, attempts, last_attempt_at, last_error, created_at)
SELECT
  gen_random_uuid(),
  d.id,
  'medical_card',
  d.medical_card_photo_path,
  'uploaded',
  NULL,
  0,
  NULL,
  NULL,
  now()
FROM public."Drivers" d
WHERE d.medical_card_photo_path IS NOT NULL
  AND btrim(d.medical_card_photo_path) <> ''
ON CONFLICT (driver_uuid, doc_type) DO NOTHING;

-- ── Ongoing backfill trigger ─────────────────────────────────────────────
--
-- The one-time INSERTs above only grandfather what already existed at
-- migration time. A driver on an app build older than 20260815120000 has no
-- upload queue at all — EditProfileDocs.tsx there writes straight to
-- Drivers.<doc>_photo_path and never touches DriverDocuments, same as the
-- admin dashboard does today. Every such write from here forward needs the
-- same grandfathering, indefinitely (old app installs don't get patched by a
-- migration), so this keeps doing it on every Drivers write instead of once.
--
-- `drivers_backfill_document` is the single-document version of the INSERTs
-- above, called once per doc_type per trigger firing. The `ON CONFLICT ...
-- DO UPDATE ... WHERE photo_path IS DISTINCT FROM EXCLUDED.photo_path` guard
-- is what keeps this safe for a *current* app build: that build's own
-- EditProfileDocs.tsx write always lands the correct DriverDocuments row
-- (photo_path + real upload_status) BEFORE its Drivers mirror update reaches
-- the server (savePhotoToQueue, then the Drivers update, in the same local
-- transaction — see replaceDriverDocumentPhoto.ts for the replace path). By
-- the time this trigger fires, that row's photo_path already equals
-- NEW.<doc>_photo_path, so the guard is false and the trigger no-ops —
-- it only ever touches a row whose photo_path still lags behind Drivers,
-- which is exactly the old-app / admin-write case. A path cleared to
-- NULL/blank is left alone (matches the one-time backfill's WHERE above):
-- deleting the DriverDocuments row isn't needed for anything read to stay
-- correct, and this trigger's job is grandfathering, not deletion.
CREATE OR REPLACE FUNCTION public.drivers_backfill_document(
  p_driver_id uuid,
  p_doc_type text,
  p_photo_path text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_photo_path IS NULL OR btrim(p_photo_path) = '' THEN
    RETURN;
  END IF;

  INSERT INTO public."DriverDocuments"
    (id, driver_uuid, doc_type, photo_path, upload_status, gallery_asset_id, attempts, last_attempt_at, last_error, created_at)
  VALUES
    (gen_random_uuid(), p_driver_id, p_doc_type, p_photo_path, 'uploaded', NULL, 0, NULL, NULL, now())
  ON CONFLICT (driver_uuid, doc_type) DO UPDATE
    SET photo_path = EXCLUDED.photo_path,
        upload_status = 'uploaded',
        attempts = 0,
        last_attempt_at = NULL,
        last_error = NULL
    WHERE public."DriverDocuments".photo_path IS DISTINCT FROM EXCLUDED.photo_path;
END;
$$;

-- Separate INSERT/UPDATE functions rather than one branching on TG_OP:
-- `OLD` is unassigned on INSERT, and referencing `OLD.<col>` from that
-- context is a runtime error even inside a branch that "shouldn't" reach it.
-- Mirrors the DamageReportPhotos triggers in 20260820120000 for the same
-- reason.
CREATE OR REPLACE FUNCTION public.drivers_documents_after_ins()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.drivers_backfill_document(NEW.id, 'license', NEW.license_photo_path);
  PERFORM public.drivers_backfill_document(NEW.id, 'insurance', NEW.insurance_photo_path);
  PERFORM public.drivers_backfill_document(NEW.id, 'medical_card', NEW.medical_card_photo_path);
  RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.drivers_documents_after_upd()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.license_photo_path IS DISTINCT FROM OLD.license_photo_path THEN
    PERFORM public.drivers_backfill_document(NEW.id, 'license', NEW.license_photo_path);
  END IF;
  IF NEW.insurance_photo_path IS DISTINCT FROM OLD.insurance_photo_path THEN
    PERFORM public.drivers_backfill_document(NEW.id, 'insurance', NEW.insurance_photo_path);
  END IF;
  IF NEW.medical_card_photo_path IS DISTINCT FROM OLD.medical_card_photo_path THEN
    PERFORM public.drivers_backfill_document(NEW.id, 'medical_card', NEW.medical_card_photo_path);
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_drivers_documents_backfill_ins
  AFTER INSERT ON public."Drivers"
  FOR EACH ROW
  EXECUTE FUNCTION public.drivers_documents_after_ins();

CREATE TRIGGER trg_drivers_documents_backfill_upd
  AFTER UPDATE ON public."Drivers"
  FOR EACH ROW
  EXECUTE FUNCTION public.drivers_documents_after_upd();
