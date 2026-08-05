-- =============================================================
-- PaymentHistory — Row Level Security
--
-- PaymentHistory was created without RLS (20260614250000_payment_history.sql),
-- leaving payment PII (payer name/email, amounts, Stripe IDs, receipt URLs)
-- reachable via PostgREST. Lock it down:
--
--   SELECT: admin, account_manager, viewer  (PowerSync sync for the staff app)
--   INSERT / UPDATE / DELETE: none for anon or authenticated.
--
-- All writes happen only via the Supabase **service role** (Stripe webhook →
-- recordPaymentHistoryFromCheckoutSession), which bypasses RLS by design.
--
-- Manual offline payment entry (check / ACH) is deferred; no client INSERT
-- policies are added in this iteration. See docs/specs/payment-history-security.md.
-- =============================================================

alter table public."PaymentHistory" enable row level security;

-- Staff read (PowerSync + authenticated app). Mirrors the PaymentInstallments /
-- Companies pattern in 20260604110000_send_quotes.sql.
create policy "payment_history_select" on public."PaymentHistory"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

-- Intentionally NO insert / update / delete policies for anon or authenticated.
-- Writes flow exclusively through the service role (Stripe webhook / server APIs).

-- Idempotency: a redelivered `checkout.session.completed` webhook must not create
-- a duplicate row. Partial unique index (non-null only) leaves the column free for
-- future manually-entered rows without a Stripe session id. The write helper treats
-- a unique_violation (23505) as a successful no-op.
create unique index if not exists uq_payment_history_checkout_session
  on public."PaymentHistory" (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
