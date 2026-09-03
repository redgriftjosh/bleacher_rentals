-- =============================================================
-- Payment state leaves the quote hashes
--
-- A client who paid an installment was immediately asked to
-- re-sign a contract nobody had changed:
--
--   webhook records the payment
--     → reconcile writes PaymentInstallments.status / paid_at
--     → recompute_quote_hashes sees {due, amount, status}
--     → contract_hash moves
--     → trg_invalidate_signature_on_contract_change fires
--
-- The installment `status` is a cache of allocatePayments (see
-- docs/specs/payment-accounting-truth.md §3.7), never a term of
-- the agreement. It has no business in a contract fingerprint,
-- and no business in the content fingerprint either: the Pay tab
-- recomputes paid/due from PaymentHistory on every render, so a
-- payment must not raise "this quote has been updated" on the
-- payer's own screen.
--
-- What stays contract-material: the installment's `amount_cents`
-- and `due_date`, and the set of installments itself. Changing
-- any of those still invalidates the signature.
--
-- See docs/specs/payment-does-not-invalidate-signature.md §5.
--
-- ⚠️ Changing the formula moves contract_hash for EVERY event, so
-- the backfill below would invalidate every active signature in
-- the database — the very bug, at full scale. The invalidation
-- trigger is therefore disabled around the backfill, and every
-- still-active signature is re-anchored to the hash its own terms
-- now produce. This is sound precisely because `active` means the
-- signature agreed with the current terms before this migration:
-- had a real term changed, the trigger would already have
-- invalidated it. Invalidated rows are left untouched and keep
-- their historical snapshot and invalidated_at.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Same function, with payment state removed from the canonical
--    installment object in BOTH documents.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recompute_quote_hashes(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_content       jsonb;
  v_contract      jsonb;
  v_line_items    jsonb;
  v_installments  jsonb;
  v_content_hash  text;
  v_contract_hash text;
BEGIN
  IF p_event_id IS NULL THEN
    RETURN;
  END IF;

  -- Child collections, aggregated in a stable order so table row order
  -- can never change the hash spuriously (a real reorder still does).
  SELECT COALESCE(jsonb_agg(
           jsonb_build_object(
             'header', li.header,
             'description', li.description,
             'qty', li.quantity,
             'value', li.value_cents,
             'currency', li.currency
           ) ORDER BY li.created_at, li.id
         ), '[]'::jsonb)
  INTO v_line_items
  FROM public."EventLineItems" li
  WHERE li.event_uuid = p_event_id AND li.deleted = false;

  -- Terms only: when the money is owed and how much. NOT whether it has
  -- arrived — that is derived from PaymentHistory at read time.
  SELECT COALESCE(jsonb_agg(
           jsonb_build_object(
             'due', pi.due_date,
             'amount', pi.amount_cents
           ) ORDER BY pi.due_date, pi.id
         ), '[]'::jsonb)
  INTO v_installments
  FROM public."PaymentInstallments" pi
  WHERE pi.event_uuid = p_event_id;

  SELECT
    jsonb_build_object(
      'status', e.event_status,
      'validUntil', e.quote_valid_till,
      'poNumber', e.po_number,
      'eventName', e.event_name,
      'eventStart', e.event_start,
      'eventEnd', e.event_end,
      'clientNotes', COALESCE(e.external_notes, e.notes),
      'taxPercent', e.tax_percent,
      'taxAmountCents', e.tax_amount_cents,
      'termsUuid', e.terms_and_conditions_uuid,
      'termsHtml', tc.html_content,
      'contact', CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object(
        'first', c.first_name, 'last', c.last_name, 'email', c.email, 'phone', c.phone) END,
      'venue', CASE WHEN va.id IS NULL THEN NULL ELSE jsonb_build_object(
        'street', va.street, 'city', va.city, 'state', va.state_province, 'zip', va.zip_postal) END,
      'salesOffice', CASE WHEN so.id IS NULL THEN NULL ELSE jsonb_build_object(
        'name', so.name, 'phone', so.phone,
        'street', soa.street, 'city', soa.city, 'state', soa.state_province, 'zip', soa.zip_postal) END,
      'lineItems', v_line_items,
      'installments', v_installments,
      'signature', CASE WHEN sig.id IS NULL THEN NULL ELSE jsonb_build_object(
        'signer', sig.signer_name, 'signedAt', sig.signed_at) END
    ),
    jsonb_build_object(
      'eventType', e.event_type_uuid,
      'eventStart', e.event_start,
      'eventEnd', e.event_end,
      'taxPercent', e.tax_percent,
      'taxAmountCents', e.tax_amount_cents,
      'termsUuid', e.terms_and_conditions_uuid,
      'termsHtml', tc.html_content,
      'salesOfficeUuid', e.sales_office_uuid,
      'salesOffice', CASE WHEN so.id IS NULL THEN NULL ELSE jsonb_build_object(
        'name', so.name, 'phone', so.phone,
        'street', soa.street, 'city', soa.city, 'state', soa.state_province, 'zip', soa.zip_postal) END,
      'venue', CASE WHEN va.id IS NULL THEN NULL ELSE jsonb_build_object(
        'street', va.street, 'city', va.city, 'state', va.state_province, 'zip', va.zip_postal) END,
      'lineItems', v_line_items,
      'installments', v_installments
    )
  INTO v_content, v_contract
  FROM public."Events" e
  LEFT JOIN public."TermsAndConditions" tc ON tc.id = e.terms_and_conditions_uuid
  LEFT JOIN public."Contacts" c            ON c.id  = e.contact_uuid
  LEFT JOIN public."Addresses" va          ON va.id = e.address_uuid
  LEFT JOIN public."SalesOffices" so       ON so.id = e.sales_office_uuid
  LEFT JOIN public."Addresses" soa         ON soa.id = so.address_uuid
  LEFT JOIN public."ContractSignatures" sig ON sig.event_uuid = e.id AND sig.status = 'active'
  WHERE e.id = p_event_id;

  IF v_content IS NULL THEN
    RETURN; -- event no longer exists
  END IF;

  v_content_hash  := encode(extensions.digest(v_content::text,  'sha256'), 'hex');
  v_contract_hash := encode(extensions.digest(v_contract::text, 'sha256'), 'hex');

  -- Only write when something actually changed. This also terminates the
  -- Events AFTER-UPDATE recursion: the second pass computes the same hash,
  -- matches 0 rows, and fires no further trigger.
  UPDATE public."Events"
  SET content_hash = v_content_hash,
      contract_hash = v_contract_hash
  WHERE id = p_event_id
    AND (content_hash IS DISTINCT FROM v_content_hash
         OR contract_hash IS DISTINCT FROM v_contract_hash);
END;
$$;

-- -------------------------------------------------------------
-- 2. Backfill under a disabled invalidation trigger, then
--    re-anchor every still-active signature.
-- -------------------------------------------------------------
ALTER TABLE public."Events"
  DISABLE TRIGGER invalidate_signature_on_contract_change;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public."Events" LOOP
    PERFORM public.recompute_quote_hashes(r.id);
  END LOOP;
END;
$$;

UPDATE public."ContractSignatures" s
SET signed_contract_hash = e.contract_hash
FROM public."Events" e
WHERE e.id = s.event_uuid
  AND s.status = 'active'
  AND s.signed_contract_hash IS DISTINCT FROM e.contract_hash;

ALTER TABLE public."Events"
  ENABLE TRIGGER invalidate_signature_on_contract_change;

-- -------------------------------------------------------------
-- 3. Post-condition: no active signature may be left disagreeing
--    with its event. If this fires, the migration is aborted
--    rather than shipping a database full of silently
--    re-signature-demanding quotes.
-- -------------------------------------------------------------
DO $$
DECLARE
  v_drifted INT;
BEGIN
  SELECT count(*) INTO v_drifted
  FROM public."ContractSignatures" s
  JOIN public."Events" e ON e.id = s.event_uuid
  WHERE s.status = 'active'
    AND s.signed_contract_hash IS DISTINCT FROM e.contract_hash;

  IF v_drifted > 0 THEN
    RAISE EXCEPTION
      're-anchoring missed % active signature(s) — aborting rather than invalidating them',
      v_drifted;
  END IF;
END;
$$;
