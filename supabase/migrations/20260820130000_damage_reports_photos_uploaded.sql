-- DamageReports.photos_uploaded
--
-- Server-derived: true only when the report has at least one photo and every
-- one of them is confirmed in the bucket (DamageReportPhotos.upload_status =
-- 'uploaded'). Written ONLY by the triggers below - no client ever sets it.
-- Consumed by the web admin to hide reports whose evidence is still uploading.
--
-- Section 1 grandfathers every pre-existing row unconditionally (deliberate
-- human decision - no storage.objects verification, including for photos
-- that never actually reached the bucket; this queue has never run in
-- production so no historical row's upload_status is trustworthy anyway).
-- Sections 2-3 govern everything created from here forward.

-- ── 1. Column + grandfathering backfill ────────────────────────────────

ALTER TABLE public."DamageReports"
  ADD COLUMN IF NOT EXISTS photos_uploaded boolean NOT NULL DEFAULT false;

UPDATE public."DamageReports"
SET photos_uploaded = true
WHERE photos_uploaded IS DISTINCT FROM true;

-- Photo-level half of the same grandfathering. Without this, the first edit
-- or repair touching a legacy report recomputes from scratch, sees its old
-- photos still 'pending', and silently un-grandfathers it.
UPDATE public."DamageReportPhotos"
SET upload_status = 'uploaded'
WHERE upload_status IS DISTINCT FROM 'uploaded';

CREATE INDEX IF NOT EXISTS "DamageReports_photos_uploaded_idx"
  ON public."DamageReports" USING btree (photos_uploaded);

-- ── 2. Recompute function ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.damage_reports_recompute_photos_uploaded(p_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Serialize concurrent recomputes of the SAME report before reading its
  -- photos, closing a lost-update race under concurrent photo uploads.
  PERFORM 1
  FROM public."DamageReports"
  WHERE id = ANY (p_ids)
  ORDER BY id
  FOR UPDATE;

  UPDATE public."DamageReports" dr
  SET photos_uploaded = c.ready
  FROM (
    SELECT r.id,
           EXISTS (SELECT 1 FROM public."DamageReportPhotos" p
                   WHERE p.damage_report_uuid = r.id)
           AND NOT EXISTS (SELECT 1 FROM public."DamageReportPhotos" p
                           WHERE p.damage_report_uuid = r.id
                             AND p.upload_status IS DISTINCT FROM 'uploaded')
             AS ready
    FROM public."DamageReports" r
    WHERE r.id = ANY (p_ids)
  ) AS c
  WHERE dr.id = c.id
    AND dr.photos_uploaded IS DISTINCT FROM c.ready;
END;
$$;

-- ── 3. Statement-level triggers with transition tables ─────────────────

CREATE OR REPLACE FUNCTION public.damage_report_photos_after_ins()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.damage_reports_recompute_photos_uploaded(
    ARRAY(SELECT DISTINCT damage_report_uuid FROM new_rows
          WHERE damage_report_uuid IS NOT NULL));
  RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.damage_report_photos_after_upd()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.damage_reports_recompute_photos_uploaded(
    ARRAY(SELECT DISTINCT id FROM (
      SELECT n.damage_report_uuid AS id FROM new_rows n JOIN old_rows o ON o.id = n.id
       WHERE n.upload_status      IS DISTINCT FROM o.upload_status
          OR n.damage_report_uuid IS DISTINCT FROM o.damage_report_uuid
      UNION
      SELECT o.damage_report_uuid FROM new_rows n JOIN old_rows o ON o.id = n.id
       WHERE n.damage_report_uuid IS DISTINCT FROM o.damage_report_uuid
    ) t WHERE id IS NOT NULL));
  RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.damage_report_photos_after_del()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.damage_reports_recompute_photos_uploaded(
    ARRAY(SELECT DISTINCT damage_report_uuid FROM old_rows
          WHERE damage_report_uuid IS NOT NULL));
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_drp_photos_uploaded_ins AFTER INSERT ON public."DamageReportPhotos"
  REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT
  EXECUTE FUNCTION public.damage_report_photos_after_ins();

CREATE TRIGGER trg_drp_photos_uploaded_upd AFTER UPDATE ON public."DamageReportPhotos"
  REFERENCING NEW TABLE AS new_rows OLD TABLE AS old_rows FOR EACH STATEMENT
  EXECUTE FUNCTION public.damage_report_photos_after_upd();

CREATE TRIGGER trg_drp_photos_uploaded_del AFTER DELETE ON public."DamageReportPhotos"
  REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT
  EXECUTE FUNCTION public.damage_report_photos_after_del();
