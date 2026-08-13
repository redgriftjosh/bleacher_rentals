-- =============================================================
-- Automatic contract-signature invalidation on contract change
--
-- Problem: when an account manager edits a booked quote, the
-- signature stayed status='active'. GET /api/contracts/[eventId]
-- kept returning it, SignContractTab rendered "already signed",
-- and the client could never sign the revised contract.
--
-- Fix: when Events.contract_hash moves away from the hash a
-- signature was captured against, that signature no longer
-- describes the current terms — mark it invalidated.
--
-- This lives in a trigger, like the hash itself, because the
-- manager app writes through several paths (PowerSync local
-- writes that sync up, direct Supabase writes for line items,
-- server routes). A trigger covers every one of them.
--
-- Soft, never hard: a signature is a legal record. The row and
-- its stored PDF are kept; only its standing changes. This is
-- the flow the schema was built for — see
-- docs/specs/quote-staleness-detection.md §12.
-- =============================================================

-- Signatures recorded before signed_contract_hash existed have no
-- baseline, so "changed" is indistinguishable from "never tracked"
-- and the trigger below would invalidate them on the next unrelated
-- edit. Anchor them to the terms in force right now.
UPDATE public."ContractSignatures" s
SET signed_contract_hash = e.contract_hash
FROM public."Events" e
WHERE e.id = s.event_uuid
  AND s.status = 'active'
  AND s.signed_contract_hash IS NULL;

CREATE OR REPLACE FUNCTION public.trg_invalidate_signature_on_contract_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only signatures whose snapshot disagrees with the new terms. Restricting
  -- to status='active' also makes this idempotent: an already-invalidated row
  -- is never touched again, so its original invalidated_at survives.
  UPDATE public."ContractSignatures"
  SET status = 'invalidated',
      invalidated_at = now()
  WHERE event_uuid = NEW.id
    AND status = 'active'
    AND signed_contract_hash IS DISTINCT FROM NEW.contract_hash;

  RETURN NULL;
END;
$$;

-- AFTER UPDATE OF contract_hash fires whenever the column appears in a SET
-- list, so the WHEN clause is what actually restricts this to real changes.
-- It also stops the cycle: invalidating a signature flips content_hash (the
-- signed state is part of it), and that write leaves contract_hash equal, so
-- this trigger does not fire a second time.
DROP TRIGGER IF EXISTS invalidate_signature_on_contract_change ON public."Events";
CREATE TRIGGER invalidate_signature_on_contract_change
  AFTER UPDATE OF contract_hash ON public."Events"
  FOR EACH ROW
  WHEN (OLD.contract_hash IS DISTINCT FROM NEW.contract_hash)
  EXECUTE FUNCTION public.trg_invalidate_signature_on_contract_change();
