-- ============================================================================
-- Tests for automatic contract-signature invalidation.
--
-- When an account manager edits contract-material terms, Events.contract_hash
-- moves away from the hash the client signed against. The signature must then
-- be invalidated so the client can sign the revised contract — otherwise the
-- public quote page keeps rendering the old signature and hides the sign form.
-- See docs/specs/quote-staleness-detection.md §12.
--
-- Verifies:
--   * a contract-material change invalidates the active signature
--   * a non-material change (client notes, PO number) leaves it active
--   * after invalidation the client can record a NEW signature
--     (the partial unique index on active signatures no longer collides)
--   * an already-invalidated signature keeps its original invalidated_at
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

BEGIN;
SET search_path TO extensions, public, "$user";
SELECT plan(1);

DO $$
DECLARE
  v_terms    UUID;
  v_event    UUID;
  v_line     UUID;
  v_sig1     UUID;
  v_sig2     UUID;
  h_contract TEXT;
  v_status   contract_signature_status;
  v_inval    TIMESTAMPTZ;
  v_inval2   TIMESTAMPTZ;
  v_count    INT;
BEGIN
  INSERT INTO "TermsAndConditions" (id, name, html_content)
  VALUES (gen_random_uuid(), 'SigInvalidation T&C', '<p>terms</p>')
  RETURNING id INTO v_terms;

  INSERT INTO "Events" (id, event_name, event_start, event_end, lenient, must_be_clean,
                        event_status, external_notes, tax_percent, tax_amount_cents,
                        terms_and_conditions_uuid)
  VALUES (gen_random_uuid(), 'SigInvalidation', '2026-07-01', '2026-07-02', false, false,
          'booked', 'note A', 0, 0, v_terms)
  RETURNING id INTO v_event;

  INSERT INTO "EventLineItems" (id, event_uuid, header, quantity, value_cents, currency,
                                is_template, deleted)
  VALUES (gen_random_uuid(), v_event, 'Item', 1, 10000, 'USD', false, false)
  RETURNING id INTO v_line;

  -- The client signs against whatever the contract hashes to right now.
  SELECT contract_hash INTO h_contract FROM "Events" WHERE id = v_event;
  ASSERT h_contract IS NOT NULL, 'contract_hash populated before signing';

  INSERT INTO "ContractSignatures" (id, event_uuid, terms_and_conditions_uuid, signer_name,
                                    status, signed_contract_hash)
  VALUES (gen_random_uuid(), v_event, v_terms, 'Jordan Ellis', 'active', h_contract)
  RETURNING id INTO v_sig1;

  -- ── Non-material edits must NOT break a valid signature ──────────────────
  UPDATE "Events" SET external_notes = 'note B' WHERE id = v_event;
  SELECT status INTO v_status FROM "ContractSignatures" WHERE id = v_sig1;
  ASSERT v_status = 'active', 'client-note change leaves the signature active';

  UPDATE "Events" SET po_number = 'PO-123' WHERE id = v_event;
  SELECT status INTO v_status FROM "ContractSignatures" WHERE id = v_sig1;
  ASSERT v_status = 'active', 'PO-number change leaves the signature active';

  -- POST /api/contracts/sign flips event_status to 'booked' immediately after
  -- inserting the signature. If event_status ever leaked into contract_hash,
  -- every signature would invalidate itself the moment it was recorded.
  UPDATE "Events" SET event_status = 'booked' WHERE id = v_event;
  SELECT status INTO v_status FROM "ContractSignatures" WHERE id = v_sig1;
  ASSERT v_status = 'active', 'the sign route''s own status write does not self-invalidate';

  -- ── A contract-material edit invalidates it ──────────────────────────────
  UPDATE "EventLineItems" SET value_cents = 20000 WHERE id = v_line;

  SELECT status, invalidated_at INTO v_status, v_inval
  FROM "ContractSignatures" WHERE id = v_sig1;
  ASSERT v_status = 'invalidated', 'price change invalidates the signature';
  ASSERT v_inval IS NOT NULL, 'invalidated_at is stamped';

  -- ── The client can now sign the revised contract ─────────────────────────
  -- This is the user-visible fix: the partial unique index on active
  -- signatures would reject this insert if the old row stayed active.
  SELECT contract_hash INTO h_contract FROM "Events" WHERE id = v_event;
  INSERT INTO "ContractSignatures" (id, event_uuid, terms_and_conditions_uuid, signer_name,
                                    status, signed_contract_hash)
  VALUES (gen_random_uuid(), v_event, v_terms, 'Jordan Ellis', 'active', h_contract)
  RETURNING id INTO v_sig2;

  SELECT count(*) INTO v_count
  FROM "ContractSignatures" WHERE event_uuid = v_event AND status = 'active';
  ASSERT v_count = 1, 'exactly one active signature after re-signing';

  -- ── Re-invalidation must not rewrite history ─────────────────────────────
  -- Another material edit invalidates the NEW signature; the old row keeps the
  -- timestamp it was invalidated with.
  UPDATE "EventLineItems" SET value_cents = 30000 WHERE id = v_line;

  SELECT invalidated_at INTO v_inval2 FROM "ContractSignatures" WHERE id = v_sig1;
  ASSERT v_inval2 = v_inval, 'an already-invalidated signature keeps its original invalidated_at';

  SELECT status INTO v_status FROM "ContractSignatures" WHERE id = v_sig2;
  ASSERT v_status = 'invalidated', 'the second signature is invalidated by the next material edit';

  RAISE NOTICE '--- all contract_signature_invalidation assertions passed ---';
END $$;

SELECT ok(true, 'all assertions passed');

SELECT * FROM finish();

ROLLBACK;
