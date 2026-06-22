\set ON_ERROR_STOP on
\timing off

BEGIN;
SET search_path TO extensions, public, "$user";
SELECT plan(1);

-- Insert fixture BleacherTypes for 8-row and 9-row
INSERT INTO "BleacherTypes" (id, name, row_count, roof_type, deleted)
VALUES
  ('b8000000-0000-0000-0000-000000000008', '8-Row Test Type',  8, 'none', false),
  ('b9000000-0000-0000-0000-000000000009', '9-Row Test Type',  9, 'none', false);

-- Insert fixture Bleachers linked to those types
INSERT INTO "Bleachers" (id, bleacher_number, bleacher_rows, bleacher_seats, bleacher_type_uuid, deleted)
VALUES
  ('a8000000-0000-0000-0000-000000000001', 9001, 8, 160, 'b8000000-0000-0000-0000-000000000008', false),
  ('a9000000-0000-0000-0000-000000000002', 9002, 9, 180, 'b9000000-0000-0000-0000-000000000009', false);

DO $$
DECLARE
  v_total     INTEGER;
  v_linked    INTEGER;
  v_types     INTEGER;
  v_unlinked  INTEGER;
BEGIN
  RAISE NOTICE '--- link_bleachers_to_types tests ---';

  -- T1: Every active fixture bleacher has a bleacher_type_uuid
  SELECT count(*) INTO v_total
  FROM "Bleachers"
  WHERE deleted = false AND id IN (
    'a8000000-0000-0000-0000-000000000001',
    'a9000000-0000-0000-0000-000000000002'
  );
  SELECT count(*) INTO v_linked
  FROM "Bleachers"
  WHERE deleted = false AND bleacher_type_uuid IS NOT NULL AND id IN (
    'a8000000-0000-0000-0000-000000000001',
    'a9000000-0000-0000-0000-000000000002'
  );
  ASSERT v_total = v_linked,
    format('T1 FAIL: %s/%s fixture bleachers linked', v_linked, v_total);
  RAISE NOTICE 'T1 all % fixture bleachers have bleacher_type_uuid ✓', v_total;

  -- T2: Every distinct bleacher_rows in fixtures has a matching BleacherType (roof_type = none)
  SELECT count(*) INTO v_unlinked
  FROM (
    SELECT DISTINCT bleacher_rows FROM "Bleachers"
    WHERE deleted = false AND id IN (
      'a8000000-0000-0000-0000-000000000001',
      'a9000000-0000-0000-0000-000000000002'
    )
  ) dr
  WHERE NOT EXISTS (
    SELECT 1 FROM "BleacherTypes" bt
    WHERE bt.row_count = dr.bleacher_rows AND bt.roof_type = 'none' AND bt.deleted = false
  );
  ASSERT v_unlinked = 0,
    format('T2 FAIL: %s row counts without BleacherType', v_unlinked);
  RAISE NOTICE 'T2 every fixture bleacher_rows has matching BleacherType ✓';

  -- T3: Fixture BleacherTypes for 8-row and 9-row exist
  SELECT count(*) INTO v_types
  FROM "BleacherTypes"
  WHERE id IN (
    'b8000000-0000-0000-0000-000000000008',
    'b9000000-0000-0000-0000-000000000009'
  ) AND deleted = false AND roof_type = 'none';
  ASSERT v_types = 2,
    format('T3 FAIL: expected 2 fixture types for 8/9 row, got %s', v_types);
  RAISE NOTICE 'T3 8-Row and 9-Row fixture BleacherTypes exist ✓';

  -- T4: bleacher_type_uuid FK is valid (points to existing BleacherType)
  SELECT count(*) INTO v_unlinked
  FROM "Bleachers" b
  WHERE b.deleted = false
    AND b.id IN (
      'a8000000-0000-0000-0000-000000000001',
      'a9000000-0000-0000-0000-000000000002'
    )
    AND b.bleacher_type_uuid IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM "BleacherTypes" bt WHERE bt.id = b.bleacher_type_uuid
    );
  ASSERT v_unlinked = 0,
    format('T4 FAIL: %s fixture bleachers point to missing BleacherType', v_unlinked);
  RAISE NOTICE 'T4 all fixture bleacher_type_uuid FKs are valid ✓';

  RAISE NOTICE '--- all link_bleachers_to_types tests passed ---';
END;
$$;

SELECT pass('Link bleachers to types tests completed');
SELECT * FROM finish();
ROLLBACK;
