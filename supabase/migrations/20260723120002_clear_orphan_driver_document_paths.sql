-- Clear ghost driver document paths: path exists on Drivers but object
-- is missing from storage.objects (bucket driver-documents).
--
-- After this runs, profile completion treats those docs as missing again,
-- so the driver app onboarding banner asks them to re-upload.
-- Team also shows documents as not uploaded.
--
-- Safe to re-run: only NULLs paths whose Storage object is absent.

UPDATE public."Drivers" AS d
SET
  license_photo_path = CASE
    WHEN d.license_photo_path IS NOT NULL
      AND btrim(d.license_photo_path) <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM storage.objects o
        WHERE o.bucket_id = 'driver-documents'
          AND o.name = d.license_photo_path
      )
    THEN NULL
    ELSE d.license_photo_path
  END,
  insurance_photo_path = CASE
    WHEN d.insurance_photo_path IS NOT NULL
      AND btrim(d.insurance_photo_path) <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM storage.objects o
        WHERE o.bucket_id = 'driver-documents'
          AND o.name = d.insurance_photo_path
      )
    THEN NULL
    ELSE d.insurance_photo_path
  END,
  medical_card_photo_path = CASE
    WHEN d.medical_card_photo_path IS NOT NULL
      AND btrim(d.medical_card_photo_path) <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM storage.objects o
        WHERE o.bucket_id = 'driver-documents'
          AND o.name = d.medical_card_photo_path
      )
    THEN NULL
    ELSE d.medical_card_photo_path
  END
WHERE
  (
    d.license_photo_path IS NOT NULL
    AND btrim(d.license_photo_path) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM storage.objects o
      WHERE o.bucket_id = 'driver-documents'
        AND o.name = d.license_photo_path
    )
  )
  OR (
    d.insurance_photo_path IS NOT NULL
    AND btrim(d.insurance_photo_path) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM storage.objects o
      WHERE o.bucket_id = 'driver-documents'
        AND o.name = d.insurance_photo_path
    )
  )
  OR (
    d.medical_card_photo_path IS NOT NULL
    AND btrim(d.medical_card_photo_path) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM storage.objects o
      WHERE o.bucket_id = 'driver-documents'
        AND o.name = d.medical_card_photo_path
    )
  );
