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
