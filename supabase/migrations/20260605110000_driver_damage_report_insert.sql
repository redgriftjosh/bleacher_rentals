-- =============================================================
-- Driver self-service RLS policies
--
-- The RBAC migration (20260513) only grants access to admin/AM/viewer.
-- Drivers need access to several tables for the mobile app to work:
--   - DamageReports / DamageReportPhotos (create damage reports)
--   - WorkTrackerInspections / InspectionPhotos (inspections)
--   - Drivers (read/update own profile, docs, vehicle link)
--   - Addresses (create/update own address)
--   - Vehicles (create/update own vehicle)
--   - DriverUnavailability (manage availability calendar)
-- =============================================================

-- ═══════════════════════════════════════════════════════════════
-- 1. DamageReports
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "driver_damage_report_select"
  ON public."DamageReports"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.get_current_driver_id() IS NOT NULL);

CREATE POLICY "driver_damage_report_insert"
  ON public."DamageReports"
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (public.get_current_driver_id() IS NOT NULL);

-- ═══════════════════════════════════════════════════════════════
-- 2. DamageReportPhotos
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "driver_damage_report_photos_select"
  ON public."DamageReportPhotos"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.get_current_driver_id() IS NOT NULL);

CREATE POLICY "driver_damage_report_photos_insert"
  ON public."DamageReportPhotos"
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (public.get_current_driver_id() IS NOT NULL);

-- ═══════════════════════════════════════════════════════════════
-- 3. WorkTrackerInspections (driver creates inspections)
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "driver_inspections_select"
  ON public."WorkTrackerInspections"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.get_current_driver_id() IS NOT NULL);

CREATE POLICY "driver_inspections_insert"
  ON public."WorkTrackerInspections"
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (public.get_current_driver_id() IS NOT NULL);

-- ═══════════════════════════════════════════════════════════════
-- 4. InspectionPhotos
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "driver_inspection_photos_select"
  ON public."InspectionPhotos"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.get_current_driver_id() IS NOT NULL);

CREATE POLICY "driver_inspection_photos_insert"
  ON public."InspectionPhotos"
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (public.get_current_driver_id() IS NOT NULL);

-- ═══════════════════════════════════════════════════════════════
-- 5. Drivers (self-read + self-update for profile/docs/vehicle)
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "driver_self_select"
  ON public."Drivers"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    public.get_current_driver_id() IS NOT NULL
    AND id = public.get_current_driver_id()
  );

CREATE POLICY "driver_self_update"
  ON public."Drivers"
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    public.get_current_driver_id() IS NOT NULL
    AND id = public.get_current_driver_id()
  )
  WITH CHECK (
    public.get_current_driver_id() IS NOT NULL
    AND id = public.get_current_driver_id()
  );

-- ═══════════════════════════════════════════════════════════════
-- 6. Addresses (driver creates/updates own address)
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "driver_addresses_select"
  ON public."Addresses"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.get_current_driver_id() IS NOT NULL);

CREATE POLICY "driver_addresses_insert"
  ON public."Addresses"
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (public.get_current_driver_id() IS NOT NULL);

CREATE POLICY "driver_addresses_update"
  ON public."Addresses"
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (public.get_current_driver_id() IS NOT NULL);

-- ═══════════════════════════════════════════════════════════════
-- 7. Vehicles (driver creates/updates own vehicle)
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "driver_vehicles_select"
  ON public."Vehicles"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.get_current_driver_id() IS NOT NULL);

CREATE POLICY "driver_vehicles_insert"
  ON public."Vehicles"
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (public.get_current_driver_id() IS NOT NULL);

CREATE POLICY "driver_vehicles_update"
  ON public."Vehicles"
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (public.get_current_driver_id() IS NOT NULL);

-- ═══════════════════════════════════════════════════════════════
-- 8. DriverUnavailability (manage own calendar)
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "driver_unavailability_select"
  ON public."DriverUnavailability"
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    public.get_current_driver_id() IS NOT NULL
    AND driver_uuid = public.get_current_driver_id()
  );

CREATE POLICY "driver_unavailability_insert"
  ON public."DriverUnavailability"
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    public.get_current_driver_id() IS NOT NULL
    AND driver_uuid = public.get_current_driver_id()
  );

CREATE POLICY "driver_unavailability_delete"
  ON public."DriverUnavailability"
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    public.get_current_driver_id() IS NOT NULL
    AND driver_uuid = public.get_current_driver_id()
  );
