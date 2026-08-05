-- =============================================================
-- Public quote staleness detection — stored content hashes
--
-- Adds two deterministic content fingerprints to every Events row:
--   content_hash  — everything the client SEES on /quote/{id}
--                   (drives the "This quote has been updated" modal)
--   contract_hash — only contract-material terms
--                   (drives the sign-time guard and future re-sign)
--
-- Both are recomputed by triggers whenever the quote or any related
-- row changes, so the public /api/quotes/[id]/version endpoint can
-- answer with a single indexed column read.
--
-- Determinism: a canonical jsonb document (fixed keys, child rows
-- aggregated ORDER BY a stable key) hashed with pgcrypto sha256.
-- See docs/specs/quote-staleness-detection.md.
-- =============================================================

ALTER TABLE public."Events"
  ADD COLUMN IF NOT EXISTS content_hash  text,
  ADD COLUMN IF NOT EXISTS contract_hash text;

-- Snapshot of contract_hash captured at signing (used by the sign-time
-- guard now, and the future re-sign flow).
ALTER TABLE public."ContractSignatures"
  ADD COLUMN IF NOT EXISTS signed_contract_hash text;

-- -------------------------------------------------------------
-- recompute_quote_hashes(event_id): build both canonical docs and
-- store their sha256 hex on the Events row (no-op when unchanged).
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

  SELECT COALESCE(jsonb_agg(
           jsonb_build_object(
             'due', pi.due_date,
             'amount', pi.amount_cents,
             'status', pi.status
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
-- Trigger glue
-- -------------------------------------------------------------

-- Events: own fields changed.
CREATE OR REPLACE FUNCTION public.trg_recompute_quote_hashes_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM public.recompute_quote_hashes(NEW.id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS recompute_quote_hashes_events ON public."Events";
CREATE TRIGGER recompute_quote_hashes_events
  AFTER INSERT OR UPDATE ON public."Events"
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_quote_hashes_events();

-- Owned children: line items & payment installments.
CREATE OR REPLACE FUNCTION public.trg_recompute_quote_hashes_child()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_quote_hashes(OLD.event_uuid);
  ELSE
    PERFORM public.recompute_quote_hashes(NEW.event_uuid);
    IF TG_OP = 'UPDATE' AND OLD.event_uuid IS DISTINCT FROM NEW.event_uuid THEN
      PERFORM public.recompute_quote_hashes(OLD.event_uuid);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS recompute_quote_hashes_line_items ON public."EventLineItems";
CREATE TRIGGER recompute_quote_hashes_line_items
  AFTER INSERT OR UPDATE OR DELETE ON public."EventLineItems"
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_quote_hashes_child();

DROP TRIGGER IF EXISTS recompute_quote_hashes_installments ON public."PaymentInstallments";
CREATE TRIGGER recompute_quote_hashes_installments
  AFTER INSERT OR UPDATE OR DELETE ON public."PaymentInstallments"
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_quote_hashes_child();

-- ContractSignatures: signed-state is shown in content_hash.
CREATE OR REPLACE FUNCTION public.trg_recompute_quote_hashes_signature()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_quote_hashes(OLD.event_uuid);
  ELSE
    PERFORM public.recompute_quote_hashes(NEW.event_uuid);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS recompute_quote_hashes_signature ON public."ContractSignatures";
CREATE TRIGGER recompute_quote_hashes_signature
  AFTER INSERT OR UPDATE OR DELETE ON public."ContractSignatures"
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_quote_hashes_signature();

-- (D2) Shared entities: recompute every event that references the edited row.
CREATE OR REPLACE FUNCTION public.trg_recompute_quote_hashes_contacts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM public.recompute_quote_hashes(e.id)
  FROM public."Events" e WHERE e.contact_uuid = NEW.id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS recompute_quote_hashes_contacts ON public."Contacts";
CREATE TRIGGER recompute_quote_hashes_contacts
  AFTER UPDATE ON public."Contacts"
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_quote_hashes_contacts();

CREATE OR REPLACE FUNCTION public.trg_recompute_quote_hashes_terms()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM public.recompute_quote_hashes(e.id)
  FROM public."Events" e WHERE e.terms_and_conditions_uuid = NEW.id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS recompute_quote_hashes_terms ON public."TermsAndConditions";
CREATE TRIGGER recompute_quote_hashes_terms
  AFTER UPDATE ON public."TermsAndConditions"
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_quote_hashes_terms();

CREATE OR REPLACE FUNCTION public.trg_recompute_quote_hashes_sales_offices()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM public.recompute_quote_hashes(e.id)
  FROM public."Events" e WHERE e.sales_office_uuid = NEW.id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS recompute_quote_hashes_sales_offices ON public."SalesOffices";
CREATE TRIGGER recompute_quote_hashes_sales_offices
  AFTER UPDATE ON public."SalesOffices"
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_quote_hashes_sales_offices();

-- Addresses feed both the event venue and the sales-office address.
CREATE OR REPLACE FUNCTION public.trg_recompute_quote_hashes_addresses()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM public.recompute_quote_hashes(e.id)
  FROM public."Events" e
  WHERE e.address_uuid = NEW.id
     OR e.sales_office_uuid IN (
          SELECT so.id FROM public."SalesOffices" so WHERE so.address_uuid = NEW.id
        );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS recompute_quote_hashes_addresses ON public."Addresses";
CREATE TRIGGER recompute_quote_hashes_addresses
  AFTER UPDATE ON public."Addresses"
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_quote_hashes_addresses();

-- -------------------------------------------------------------
-- Backfill existing rows.
-- -------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public."Events" LOOP
    PERFORM public.recompute_quote_hashes(r.id);
  END LOOP;
END;
$$;
