#!/usr/bin/env bash
# ============================================================================
# Concurrency check for DamageReports.photos_uploaded
#
# Two overlapping transactions each confirm a different photo belonging to
# the SAME damage report. Without serializing the recompute (the `FOR UPDATE`
# lock in damage_reports_recompute_photos_uploaded), this is a classic
# lost-update race: both sessions read "the other photo is still pending"
# before either commits, so both recomputes decide `photos_uploaded = false`,
# and the final state is wrong even though every photo ended up 'uploaded'.
#
# Session 1: BEGIN; UPDATE photo A -> uploaded; pg_sleep(2); COMMIT;
# Session 2 (starts ~1s in, mid-sleep): BEGIN; UPDATE photo B -> uploaded; COMMIT;
# Session 3 (after both finish): asserts photos_uploaded = true.
#
# Usage:
#   ./damage_reports_photos_uploaded.concurrency.sh
#
# Requires `psql` on PATH and a local Supabase Postgres running on the usual
# local port (override with DB_URL). Requires the trigger from
# 20260820120000_damage_reports_photos_uploaded.sql to already be applied.
# ============================================================================

set -euo pipefail

DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

# Fixed, namespaced UUIDs so repeat runs are trivially idempotent.
BLEACHER_ID="c0ffee00-0000-4000-8000-000000000001"
REPORT_ID="c0ffee00-0000-4000-8000-000000000002"
PHOTO_A_ID="c0ffee00-0000-4000-8000-0000000000a1"
PHOTO_B_ID="c0ffee00-0000-4000-8000-0000000000b2"

cleanup() {
  psql "$DB_URL" -v ON_ERROR_STOP=1 -q -c "
    DELETE FROM \"DamageReportPhotos\" WHERE id IN ('${PHOTO_A_ID}', '${PHOTO_B_ID}');
    DELETE FROM \"DamageReports\" WHERE id = '${REPORT_ID}';
    DELETE FROM \"Bleachers\" WHERE id = '${BLEACHER_ID}';
  " >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "--- setting up fixture: 1 report, 2 pending photos ---"
cleanup
psql "$DB_URL" -v ON_ERROR_STOP=1 -q -c "
  INSERT INTO \"Bleachers\" (id, bleacher_number, bleacher_rows, bleacher_seats)
  VALUES ('${BLEACHER_ID}', 9991, 5, 50);

  INSERT INTO \"DamageReports\" (id, bleacher_uuid, seat_damage, haul_damage, note)
  VALUES ('${REPORT_ID}', '${BLEACHER_ID}', 'minor', 'none', 'concurrency fixture');

  INSERT INTO \"DamageReportPhotos\" (id, damage_report_uuid, photo_path, upload_status)
  VALUES ('${PHOTO_A_ID}', '${REPORT_ID}', 'concurrency-a.jpg', 'pending'),
         ('${PHOTO_B_ID}', '${REPORT_ID}', 'concurrency-b.jpg', 'pending');
"

echo "--- session 1: confirming photo A, sleeping 2s before commit ---"
psql "$DB_URL" -v ON_ERROR_STOP=1 -q <<SQL &
BEGIN;
UPDATE "DamageReportPhotos" SET upload_status = 'uploaded' WHERE id = '${PHOTO_A_ID}';
SELECT pg_sleep(2);
COMMIT;
SQL
SESSION1_PID=$!

sleep 1

echo "--- session 2: confirming photo B while session 1 is mid-sleep ---"
psql "$DB_URL" -v ON_ERROR_STOP=1 -q <<SQL &
BEGIN;
UPDATE "DamageReportPhotos" SET upload_status = 'uploaded' WHERE id = '${PHOTO_B_ID}';
COMMIT;
SQL
SESSION2_PID=$!

wait "$SESSION1_PID"
wait "$SESSION2_PID"

echo "--- session 3: asserting final state ---"
RESULT=$(psql "$DB_URL" -v ON_ERROR_STOP=1 -tA -c "
  SELECT photos_uploaded FROM \"DamageReports\" WHERE id = '${REPORT_ID}';
")
RESULT="$(echo "$RESULT" | xargs)"

if [ "$RESULT" = "t" ]; then
  echo "PASS: photos_uploaded = true after both photos confirmed under overlapping transactions"
  exit 0
else
  echo "FAIL: expected photos_uploaded = true, got '${RESULT}' (lost-update race, recompute not serialized)"
  exit 1
fi
