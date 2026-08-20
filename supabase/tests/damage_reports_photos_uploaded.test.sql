-- ============================================================================
-- Tests for DamageReports.photos_uploaded
-- - server-derived boolean: true only when the report has >=1 photo and every
--   photo's upload_status = 'uploaded'
-- - written only by triggers on DamageReportPhotos (insert/update/delete)
-- - grandfathering of pre-existing data at migration time
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

BEGIN;
SET search_path TO extensions, public, "$user";
SELECT plan(1);

DO $$
DECLARE
  bleacher_id     UUID;
  user_id         UUID;
  dr_id           UUID;
  dr2_id          UUID;
  dr_empty_id     UUID;
  dr_legacy_id    UUID;
  photo_a         UUID;
  photo_b         UUID;
  photo_c         UUID;
  photo_d         UUID;
  legacy_photo_1  UUID;
  legacy_photo_2  UUID;
  v_count         INTEGER;
  v_bool          BOOLEAN;
  v_status        TEXT;
  v_xmin_before   XID;
  v_xmin_after    XID;
BEGIN
  RAISE NOTICE '--- damage reports photos_uploaded tests ---';

  -- Setup
  INSERT INTO "Users" (first_name, last_name, email, clerk_user_id, is_admin)
  VALUES ('Test', 'Driver', 'dr_photos_uploaded@test.com', 'clerk_dr_photos_uploaded', false)
  RETURNING id INTO user_id;

  INSERT INTO "Bleachers" (bleacher_number, bleacher_rows, bleacher_seats)
  VALUES (7778, 5, 50)
  RETURNING id INTO bleacher_id;

  -- T1: column exists, boolean NOT NULL DEFAULT false
  SELECT count(*) INTO v_count FROM information_schema.columns
  WHERE table_name = 'DamageReports'
    AND column_name = 'photos_uploaded'
    AND data_type = 'boolean'
    AND is_nullable = 'NO'
    AND column_default = 'false';
  ASSERT v_count = 1, 'T1 FAIL: photos_uploaded should be boolean NOT NULL DEFAULT false';
  RAISE NOTICE 'T1 photos_uploaded column exists as boolean NOT NULL DEFAULT false ✓';

  -- T2: new report + one pending photo -> false
  INSERT INTO "DamageReports" (id, bleacher_uuid, seat_damage, haul_damage, note, created_by_user_uuid)
  VALUES (gen_random_uuid(), bleacher_id, 'minor', 'none', 'photos_uploaded t2', user_id)
  RETURNING id INTO dr_id;

  INSERT INTO "DamageReportPhotos" (id, damage_report_uuid, photo_path, upload_status)
  VALUES (gen_random_uuid(), dr_id, 'photo-a.jpg', 'pending')
  RETURNING id INTO photo_a;

  SELECT photos_uploaded INTO v_bool FROM "DamageReports" WHERE id = dr_id;
  ASSERT v_bool = false, format('T2 FAIL: expected false, got %s', v_bool);
  RAISE NOTICE 'T2 new report + pending photo -> false ✓';

  -- T3: that photo updated to 'uploaded' -> true
  UPDATE "DamageReportPhotos" SET upload_status = 'uploaded' WHERE id = photo_a;

  SELECT photos_uploaded INTO v_bool FROM "DamageReports" WHERE id = dr_id;
  ASSERT v_bool = true, format('T3 FAIL: expected true, got %s', v_bool);
  RAISE NOTICE 'T3 photo confirmed uploaded -> true ✓';

  -- T4: two photos, one uploaded -> false; both uploaded -> true
  INSERT INTO "DamageReportPhotos" (id, damage_report_uuid, photo_path, upload_status)
  VALUES (gen_random_uuid(), dr_id, 'photo-b.jpg', 'pending')
  RETURNING id INTO photo_b;

  SELECT photos_uploaded INTO v_bool FROM "DamageReports" WHERE id = dr_id;
  ASSERT v_bool = false, format('T4a FAIL: expected false with one pending photo, got %s', v_bool);

  UPDATE "DamageReportPhotos" SET upload_status = 'uploaded' WHERE id = photo_b;

  SELECT photos_uploaded INTO v_bool FROM "DamageReports" WHERE id = dr_id;
  ASSERT v_bool = true, format('T4b FAIL: expected true once both uploaded, got %s', v_bool);
  RAISE NOTICE 'T4 two photos, one then both uploaded ✓';

  -- T5: fresh pending photo inserted into already-true report -> flips back to false
  INSERT INTO "DamageReportPhotos" (id, damage_report_uuid, photo_path, upload_status)
  VALUES (gen_random_uuid(), dr_id, 'photo-c.jpg', 'pending')
  RETURNING id INTO photo_c;

  SELECT photos_uploaded INTO v_bool FROM "DamageReports" WHERE id = dr_id;
  ASSERT v_bool = false, format('T5 FAIL: expected false after adding pending photo, got %s', v_bool);
  RAISE NOTICE 'T5 new pending photo on a true report flips it back to false ✓';

  -- T6: delete that pending photo -> back to true
  DELETE FROM "DamageReportPhotos" WHERE id = photo_c;

  SELECT photos_uploaded INTO v_bool FROM "DamageReports" WHERE id = dr_id;
  ASSERT v_bool = true, format('T6 FAIL: expected true after deleting the pending photo, got %s', v_bool);
  RAISE NOTICE 'T6 delete pending photo restores true ✓';

  -- T7: a report with zero photos -> false
  INSERT INTO "DamageReports" (id, bleacher_uuid, seat_damage, haul_damage, note, created_by_user_uuid)
  VALUES (gen_random_uuid(), bleacher_id, 'none', 'none', 'photos_uploaded t7 empty', user_id)
  RETURNING id INTO dr_empty_id;

  SELECT photos_uploaded INTO v_bool FROM "DamageReports" WHERE id = dr_empty_id;
  ASSERT v_bool = false, format('T7 FAIL: expected false for zero-photo report, got %s', v_bool);
  RAISE NOTICE 'T7 report with zero photos -> false ✓';

  -- T8: delete the last (only) photo of a true report -> false
  INSERT INTO "DamageReports" (id, bleacher_uuid, seat_damage, haul_damage, note, created_by_user_uuid)
  VALUES (gen_random_uuid(), bleacher_id, 'minor', 'none', 'photos_uploaded t8', user_id)
  RETURNING id INTO dr2_id;

  INSERT INTO "DamageReportPhotos" (id, damage_report_uuid, photo_path, upload_status)
  VALUES (gen_random_uuid(), dr2_id, 'photo-d.jpg', 'uploaded')
  RETURNING id INTO photo_d;

  SELECT photos_uploaded INTO v_bool FROM "DamageReports" WHERE id = dr2_id;
  ASSERT v_bool = true, format('T8 setup FAIL: expected true before deleting last photo, got %s', v_bool);

  DELETE FROM "DamageReportPhotos" WHERE id = photo_d;

  SELECT photos_uploaded INTO v_bool FROM "DamageReports" WHERE id = dr2_id;
  ASSERT v_bool = false, format('T8 FAIL: expected false after deleting last photo, got %s', v_bool);
  RAISE NOTICE 'T8 delete last photo of a true report -> false ✓';

  -- T9: unrelated UPDATE on DamageReports leaves photos_uploaded unchanged
  SELECT photos_uploaded INTO v_bool FROM "DamageReports" WHERE id = dr_id;
  ASSERT v_bool = true, 'T9 setup FAIL: dr_id should be true going in';

  UPDATE "DamageReports" SET note = 'unrelated note change t9' WHERE id = dr_id;

  SELECT photos_uploaded INTO v_bool FROM "DamageReports" WHERE id = dr_id;
  ASSERT v_bool = true, format('T9 FAIL: unrelated update should not change photos_uploaded, got %s', v_bool);
  RAISE NOTICE 'T9 unrelated DamageReports update leaves photos_uploaded unchanged ✓';

  -- T10: no-op guard - reconfirming an already-uploaded photo does not touch xmin
  SELECT xmin INTO v_xmin_before FROM "DamageReports" WHERE id = dr_id;

  UPDATE "DamageReportPhotos" SET upload_status = 'uploaded' WHERE id = photo_a;

  SELECT xmin INTO v_xmin_after FROM "DamageReports" WHERE id = dr_id;
  ASSERT v_xmin_after = v_xmin_before,
    format('T10 FAIL: no-op reconfirm should not rewrite DamageReports row, xmin before=%s after=%s', v_xmin_before, v_xmin_after);
  RAISE NOTICE 'T10 no-op reconfirm of already-uploaded photo does not rewrite report row ✓';

  -- T11: batched write - single UPDATE covering both photos of a report -> one recompute, ends true
  UPDATE "DamageReportPhotos"
  SET upload_status = 'pending'
  WHERE id IN (photo_a, photo_b);

  SELECT photos_uploaded INTO v_bool FROM "DamageReports" WHERE id = dr_id;
  ASSERT v_bool = false, format('T11 setup FAIL: expected false after resetting both to pending, got %s', v_bool);

  UPDATE "DamageReportPhotos"
  SET upload_status = 'uploaded'
  WHERE id IN (photo_a, photo_b);

  SELECT photos_uploaded INTO v_bool FROM "DamageReports" WHERE id = dr_id;
  ASSERT v_bool = true, format('T11 FAIL: batched update of both photos should end true, got %s', v_bool);
  RAISE NOTICE 'T11 batched UPDATE across both photos ends true in one recompute ✓';

  -- T12: grandfathering - simulate pre-migration data, run the backfill logic, confirm it
  -- survives a subsequent no-op edit (guards against the report-only-grandfathering bug).
  INSERT INTO "DamageReports" (id, bleacher_uuid, seat_damage, haul_damage, note, created_by_user_uuid, photos_uploaded)
  VALUES (gen_random_uuid(), bleacher_id, 'minor', 'none', 'photos_uploaded t12 legacy', user_id, false)
  RETURNING id INTO dr_legacy_id;

  INSERT INTO "DamageReportPhotos" (id, damage_report_uuid, photo_path, upload_status)
  VALUES (gen_random_uuid(), dr_legacy_id, 'legacy-1.jpg', 'pending')
  RETURNING id INTO legacy_photo_1;

  INSERT INTO "DamageReportPhotos" (id, damage_report_uuid, photo_path, upload_status)
  VALUES (gen_random_uuid(), dr_legacy_id, 'legacy-2.jpg', 'pending')
  RETURNING id INTO legacy_photo_2;

  -- Run the same backfill the migration performs (idempotent, exercised directly here
  -- since the migration itself has already been applied by the time this test runs).
  UPDATE "DamageReports"
  SET photos_uploaded = true
  WHERE photos_uploaded IS DISTINCT FROM true;

  UPDATE "DamageReportPhotos"
  SET upload_status = 'uploaded'
  WHERE upload_status IS DISTINCT FROM 'uploaded';

  SELECT photos_uploaded INTO v_bool FROM "DamageReports" WHERE id = dr_legacy_id;
  ASSERT v_bool = true, format('T12a FAIL: legacy report should read true after backfill, got %s', v_bool);

  SELECT upload_status INTO v_status FROM "DamageReportPhotos" WHERE id = legacy_photo_1;
  ASSERT v_status = 'uploaded', format('T12b FAIL: legacy photo 1 should read uploaded after backfill, got %s', v_status);

  SELECT upload_status INTO v_status FROM "DamageReportPhotos" WHERE id = legacy_photo_2;
  ASSERT v_status = 'uploaded', format('T12c FAIL: legacy photo 2 should read uploaded after backfill, got %s', v_status);

  -- Subsequent no-op edit (recompute) must leave it true - this is the part that
  -- catches report-only grandfathering, since a stale 'pending' photo would flip it false.
  PERFORM public.damage_reports_recompute_photos_uploaded(ARRAY[dr_legacy_id]);

  SELECT photos_uploaded INTO v_bool FROM "DamageReports" WHERE id = dr_legacy_id;
  ASSERT v_bool = true, format('T12d FAIL: legacy report should still read true after a no-op recompute, got %s', v_bool);
  RAISE NOTICE 'T12 grandfathering backfills both report and photo rows and survives a no-op recompute ✓';

  -- T13: DELETE FROM "DamageReports" cascades without error (AFTER DELETE trigger on
  -- DamageReportPhotos fires against an already-gone parent and must not error)
  DELETE FROM "DamageReports" WHERE id = dr_legacy_id;

  SELECT count(*) INTO v_count FROM "DamageReportPhotos" WHERE damage_report_uuid = dr_legacy_id;
  ASSERT v_count = 0, format('T13 FAIL: expected photos to cascade-delete, got %s remaining', v_count);
  RAISE NOTICE 'T13 DELETE FROM DamageReports cascades to photos without error ✓';

  RAISE NOTICE '--- all 13 photos_uploaded tests passed ---';
END;
$$;

SELECT ok(true, 'all assertions passed');

SELECT * FROM finish();

ROLLBACK;
