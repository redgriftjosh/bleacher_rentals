-- ============================================================================
-- Tests for the quote content-hash triggers (staleness detection).
-- Plain-ASSERT style (no pgTAP dependency) so it runs via psql or docker exec.
-- Verifies:
--   * insert populates content_hash + contract_hash
--   * a contract-material change (line item price) flips BOTH hashes
--   * hashing is deterministic (exact revert restores the original hash)
--   * a client-notes-only change flips content_hash but NOT contract_hash
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;
SET search_path TO extensions, public, "$user";

DO $$
DECLARE
  v_event    UUID;
  v_line     UUID;
  h_content0 TEXT; h_contract0 TEXT;
  h_content1 TEXT; h_contract1 TEXT;
BEGIN
  INSERT INTO "Events" (id, event_name, event_start, event_end, lenient, must_be_clean,
                        event_status, external_notes, tax_percent, tax_amount_cents)
  VALUES (gen_random_uuid(), 'HashTest', '2026-07-01', '2026-07-02', false, false,
          'quoted', 'note A', 0, 0)
  RETURNING id INTO v_event;

  INSERT INTO "EventLineItems" (id, event_uuid, header, quantity, value_cents, currency,
                                is_template, deleted)
  VALUES (gen_random_uuid(), v_event, 'Item', 1, 10000, 'USD', false, false)
  RETURNING id INTO v_line;

  SELECT content_hash, contract_hash INTO h_content0, h_contract0
  FROM "Events" WHERE id = v_event;
  ASSERT h_content0 IS NOT NULL,  'content_hash populated on insert';
  ASSERT h_contract0 IS NOT NULL, 'contract_hash populated on insert';

  -- Contract-material change → both hashes flip.
  UPDATE "EventLineItems" SET value_cents = 20000 WHERE id = v_line;
  SELECT content_hash, contract_hash INTO h_content1, h_contract1
  FROM "Events" WHERE id = v_event;
  ASSERT h_content1  IS DISTINCT FROM h_content0,  'price change flips content_hash';
  ASSERT h_contract1 IS DISTINCT FROM h_contract0, 'price change flips contract_hash';

  -- Exact revert → deterministic restore.
  UPDATE "EventLineItems" SET value_cents = 10000 WHERE id = v_line;
  SELECT content_hash INTO h_content1 FROM "Events" WHERE id = v_event;
  ASSERT h_content1 = h_content0, 'reverting the price restores the original content_hash';

  -- Client-notes-only change → content flips, contract unchanged.
  UPDATE "Events" SET external_notes = 'note B' WHERE id = v_event;
  SELECT content_hash, contract_hash INTO h_content1, h_contract1
  FROM "Events" WHERE id = v_event;
  ASSERT h_content1  IS DISTINCT FROM h_content0,  'client-note change flips content_hash';
  ASSERT h_contract1 = h_contract0, 'client-note change does NOT flip contract_hash';

  RAISE NOTICE 'quote_content_hash: all assertions passed';
END $$;

ROLLBACK;
