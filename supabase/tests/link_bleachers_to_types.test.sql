\set ON_ERROR_STOP on
\timing off

BEGIN;
SET search_path TO extensions, public, "$user";
SELECT plan(1);

DO $$
DECLARE
  v_total     INTEGER;
  v_linked    INTEGER;
  v_types     INTEGER;
  v_unlinked  INTEGER;
BEGIN
  RAISE NOTICE '--- link_bleachers_to_types tests ---';

  -- T1: Every active bleacher has a bleacher_type_uuid
  SELECT count(*) INTO v_total FROM "Bleachers" WHERE deleted = false;
  SELECT count(*) INTO v_linked FROM "Bleachers" WHERE deleted = false AND bleacher_type_uuid IS NOT NULL;
  ASSERT v_total = v_linked,
    format('T1 FAIL: %s/%s bleachers linked', v_linked, v_total);
  RAISE NOTICE 'T1 all % active bleachers have bleacher_type_uuid ✓', v_total;

  -- T2: Every distinct bleacher_rows has a matching BleacherType (roof_type = none)
  SELECT count(*) INTO v_unlinked
  FROM (SELECT DISTINCT bleacher_rows FROM "Bleachers" WHERE deleted = false) dr
  WHERE NOT EXISTS (
    SELECT 1 FROM "BleacherTypes" bt
    WHERE bt.row_count = dr.bleacher_rows AND bt.roof_type = 'none' AND bt.deleted = false
  );
  ASSERT v_unlinked = 0,
    format('T2 FAIL: %s row counts without BleacherType', v_unlinked);
  RAISE NOTICE 'T2 every bleacher_rows has matching BleacherType ✓';

  -- T3: BleacherTypes for 8-row and 9-row exist
  SELECT count(*) INTO v_types
  FROM "BleacherTypes"
  WHERE row_count IN (8, 9) AND deleted = false AND roof_type = 'none';
  ASSERT v_types = 2,
    format('T3 FAIL: expected 2 types for 8/9 row, got %s', v_types);
  RAISE NOTICE 'T3 8-Row and 9-Row BleacherTypes exist ✓';

  -- T4: bleacher_type_uuid FK is valid (points to existing BleacherType)
  SELECT count(*) INTO v_unlinked
  FROM "Bleachers" b
  WHERE b.deleted = false
    AND b.bleacher_type_uuid IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM "BleacherTypes" bt WHERE bt.id = b.bleacher_type_uuid
    );
  ASSERT v_unlinked = 0,
    format('T4 FAIL: %s bleachers point to missing BleacherType', v_unlinked);
  RAISE NOTICE 'T4 all bleacher_type_uuid FKs are valid ✓';

  RAISE NOTICE '--- all link_bleachers_to_types tests passed ---';
END;
$$;

SELECT pass('Link bleachers to types tests completed');
SELECT * FROM finish();
ROLLBACK;
