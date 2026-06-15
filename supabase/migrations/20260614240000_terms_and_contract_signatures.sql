-- TermsAndConditions: stores reusable contract templates as HTML
CREATE TABLE IF NOT EXISTS public."TermsAndConditions" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  html_content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by_user_uuid uuid REFERENCES public."Users"(id),
  deleted boolean NOT NULL DEFAULT false
);

ALTER TABLE public."TermsAndConditions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read TermsAndConditions"
  ON public."TermsAndConditions" FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert TermsAndConditions"
  ON public."TermsAndConditions" FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update TermsAndConditions"
  ON public."TermsAndConditions" FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Contract signature status enum
CREATE TYPE public.contract_signature_status AS ENUM ('active', 'invalidated');

-- ContractSignatures: journal of all contract signings
CREATE TABLE IF NOT EXISTS public."ContractSignatures" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_uuid uuid NOT NULL REFERENCES public."Events"(id),
  terms_and_conditions_uuid uuid NOT NULL REFERENCES public."TermsAndConditions"(id),
  signer_name text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  signed_pdf_path text,
  status public.contract_signature_status NOT NULL DEFAULT 'active',
  invalidated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public."ContractSignatures" ENABLE ROW LEVEL SECURITY;

-- Public read for client-facing page (no auth needed)
CREATE POLICY "Anyone can read ContractSignatures"
  ON public."ContractSignatures" FOR SELECT
  TO anon, authenticated USING (true);

-- Only authenticated can insert (API route uses service role, but belt-and-suspenders)
CREATE POLICY "Authenticated users can insert ContractSignatures"
  ON public."ContractSignatures" FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update ContractSignatures"
  ON public."ContractSignatures" FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Anon can insert (client signs without auth, via API route)
CREATE POLICY "Anon can insert ContractSignatures"
  ON public."ContractSignatures" FOR INSERT
  TO anon WITH CHECK (true);

-- Partial index: fast lookup of active signature per event
CREATE UNIQUE INDEX idx_contract_signatures_active_event
  ON public."ContractSignatures" (event_uuid)
  WHERE status = 'active';

-- Add terms_and_conditions_uuid FK to Events
ALTER TABLE public."Events"
  ADD COLUMN IF NOT EXISTS terms_and_conditions_uuid uuid
  REFERENCES public."TermsAndConditions"(id);
