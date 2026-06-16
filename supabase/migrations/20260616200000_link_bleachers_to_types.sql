-- Create missing BleacherTypes for row counts that exist in Bleachers but have no type
INSERT INTO "BleacherTypes" (name, row_count, roof_type)
SELECT
  format('%s-Row, %s Seat', b.bleacher_rows, b.bleacher_seats),
  b.bleacher_rows,
  'none'::roof_type
FROM (
  SELECT DISTINCT bleacher_rows, bleacher_seats
  FROM "Bleachers"
  WHERE deleted = false
    AND bleacher_rows NOT IN (
      SELECT row_count FROM "BleacherTypes" WHERE deleted = false AND roof_type = 'none'
    )
) b;

-- Link every bleacher to its BleacherType by row_count (using roof_type = 'none')
UPDATE "Bleachers" b
SET bleacher_type_uuid = bt.id
FROM "BleacherTypes" bt
WHERE bt.row_count = b.bleacher_rows
  AND bt.roof_type = 'none'
  AND bt.deleted = false
  AND b.deleted = false
  AND b.bleacher_type_uuid IS NULL;
