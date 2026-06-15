-- ============================================================================
-- Tests for EventFiles table and event-files storage bucket
-- - Table structure, columns, constraints
-- - FK to Events, ON DELETE CASCADE
-- - Default values (id, source, created_at)
-- - Storage bucket existence and config
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

BEGIN;
SET search_path TO extensions, public, "$user";
SELECT plan(1);

DO $$
DECLARE
  event_id       UUID;
  file_id        UUID;
  v_count        INTEGER;
  v_source       TEXT;
  v_created      TIMESTAMPTZ;
  v_file_size    BIGINT;
BEGIN
  RAISE NOTICE '--- EventFiles table tests ---';

  -- Setup: create a dummy event
  INSERT INTO "Events" (id, event_name, event_start, event_end, lenient, must_be_clean)
  VALUES (gen_random_uuid(), 'FileTest Event', '2026-07-01', '2026-07-02', false, false)
  RETURNING id INTO event_id;

  -- T1: Table exists
  SELECT count(*) INTO v_count FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'EventFiles';
  ASSERT v_count = 1, 'T1 FAIL: EventFiles table should exist';
  RAISE NOTICE 'T1 EventFiles table exists ✓';

  -- T2: All expected columns exist
  SELECT count(*) INTO v_count FROM information_schema.columns
  WHERE table_name = 'EventFiles' AND column_name IN (
    'id', 'event_uuid', 'file_name', 'storage_path',
    'mime_type', 'file_size_bytes', 'source', 'uploaded_by', 'created_at'
  );
  ASSERT v_count = 9, format('T2 FAIL: expected 9 columns, got %s', v_count);
  RAISE NOTICE 'T2 all 9 columns exist ✓';

  -- T3: Insert with defaults (id, source, created_at auto-filled)
  INSERT INTO "EventFiles" (event_uuid, file_name, storage_path, mime_type, file_size_bytes, uploaded_by)
  VALUES (event_id, 'test.pdf', 'abc/test.pdf', 'application/pdf', 12345, 'clerk_user_123')
  RETURNING id, source, created_at, file_size_bytes INTO file_id, v_source, v_created, v_file_size;

  ASSERT file_id IS NOT NULL, 'T3 FAIL: id should auto-generate';
  ASSERT v_source = 'upload', format('T3 FAIL: default source should be upload, got %s', v_source);
  ASSERT v_created IS NOT NULL, 'T3 FAIL: created_at should auto-fill';
  ASSERT v_file_size = 12345, format('T3 FAIL: file_size_bytes mismatch, got %s', v_file_size);
  RAISE NOTICE 'T3 defaults (id, source=upload, created_at) ✓';

  -- T4: source=sent_quote works
  INSERT INTO "EventFiles" (event_uuid, file_name, storage_path, source)
  VALUES (event_id, 'quote.pdf', 'abc/quote.pdf', 'sent_quote')
  RETURNING source INTO v_source;
  ASSERT v_source = 'sent_quote', 'T4 FAIL: sent_quote source not saved';
  RAISE NOTICE 'T4 source=sent_quote ✓';

  -- T5: FK constraint — bad event_uuid should fail
  BEGIN
    INSERT INTO "EventFiles" (event_uuid, file_name, storage_path)
    VALUES ('00000000-0000-0000-0000-000000000099', 'bad.pdf', 'x/bad.pdf');
    RAISE EXCEPTION 'T5 FAIL: should have thrown FK violation';
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'T5 FK constraint rejects invalid event_uuid ✓';
  END;

  -- T6: CASCADE delete — removing event removes files
  SELECT count(*) INTO v_count FROM "EventFiles" WHERE event_uuid = event_id;
  ASSERT v_count >= 2, format('T6 setup: expected >=2 files, got %s', v_count);

  DELETE FROM "Events" WHERE id = event_id;

  SELECT count(*) INTO v_count FROM "EventFiles" WHERE event_uuid = event_id;
  ASSERT v_count = 0, format('T6 FAIL: cascade should delete files, got %s remaining', v_count);
  RAISE NOTICE 'T6 ON DELETE CASCADE removes files ✓';

  -- T7: Storage bucket exists
  SELECT count(*) INTO v_count FROM storage.buckets WHERE id = 'event-files';
  ASSERT v_count = 1, 'T7 FAIL: event-files bucket should exist';
  RAISE NOTICE 'T7 event-files bucket exists ✓';

  -- T8: Bucket is private
  SELECT count(*) INTO v_count FROM storage.buckets
  WHERE id = 'event-files' AND public = false;
  ASSERT v_count = 1, 'T8 FAIL: event-files bucket should be private';
  RAISE NOTICE 'T8 bucket is private ✓';

  RAISE NOTICE '--- all EventFiles tests passed ---';
END;
$$;

SELECT pass('EventFiles table and bucket tests completed');
SELECT * FROM finish();
ROLLBACK;
