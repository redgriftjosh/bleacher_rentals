-- =============================================================
-- Contact preferred language (English / Canadian French)
--
-- Drives the language of every client-facing quote surface: the
-- public /quote/[id] page (all three tabs) and the quote PDF.
-- Resolved once in buildQuoteDocumentData() via Events.contact_uuid.
--
-- Deliberately NOT part of recompute_quote_hashes(): language changes
-- how a quote is presented, not what it says, so flipping a contact to
-- French must not fire the "this quote has been updated" modal at a
-- client who already has the page open.
-- See docs/specs/quote-preferred-language.md.
-- =============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'preferred_language') THEN
    CREATE TYPE public.preferred_language AS ENUM ('english', 'french');
  END IF;
END;
$$;

ALTER TABLE public."Contacts"
  ADD COLUMN IF NOT EXISTS preferred_language public.preferred_language
    NOT NULL DEFAULT 'english';

COMMENT ON COLUMN public."Contacts".preferred_language IS
  'Language used to render this contact''s quotes (public page + PDF). Adding a language is one ALTER TYPE ... ADD VALUE plus a dictionary entry in pdf/quoteStrings.ts.';
