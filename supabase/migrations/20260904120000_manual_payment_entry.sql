-- =============================================================
-- Manual payment entry — the ledger gets a client write path
--
-- Accounting takes money that never touches Stripe: a check in the mail, an
-- ACH transfer, a card run by hand on a terminal. Until now PaymentHistory
-- was writable only by the service role from the Stripe webhook, so none of
-- it could be recorded anywhere.
--
-- Three columns and four rules:
--
--   entry_source           who wrote the row, not what instrument was used.
--                          Legacy rows all say payment_method_type = 'card',
--                          which is indistinguishable from a manual card
--                          entry, so the distinction needs its own column.
--   recorded_by_user_uuid  attribution for a hand-entered row.
--   reference              check number, ACH trace, terminal auth code — and
--                          for Stripe rows, the method detail Stripe reported.
--
-- Amounts may be NEGATIVE, deliberately. The ledger is append-only: no UPDATE
-- and no DELETE policy exists for anyone, so an offsetting negative row is the
-- only way to express a refund, a bounced check or a corrected typo. Both the
-- error and its correction stay visible, which is what an audit trail is for.
--
-- See docs/specs/manual-payment-entry.md §4.2, §4.4, T3.
-- =============================================================

alter table public."PaymentHistory"
  add column if not exists entry_source text not null default 'stripe',
  add column if not exists recorded_by_user_uuid uuid references public."Users"(id),
  add column if not exists reference text;

comment on column public."PaymentHistory".entry_source is
  'Who wrote this row: ''stripe'' (the webhook) or ''manual'' (accounting, in the app).';
comment on column public."PaymentHistory".recorded_by_user_uuid is
  'The staff member who entered a manual row. Never set for Stripe rows.';
comment on column public."PaymentHistory".reference is
  'Check number, ACH trace or terminal auth code; for Stripe rows, the method Stripe reported.';

-- Existing rows are all webhook-written, so the default backfills them
-- correctly and no data migration is needed.
alter table public."PaymentHistory"
  add constraint payment_history_entry_source_check
  check (entry_source in ('stripe', 'manual'));

-- A zero-amount payment is never meaningful and is always a bug upstream.
-- Negatives are explicitly allowed — they are the mechanism, not an oversight.
alter table public."PaymentHistory"
  add constraint payment_history_amount_nonzero_check
  check (amount_cents <> 0);

-- Manual rows must name their method and their author; and a client must not
-- be able to write a row that claims to have come from Stripe.
alter table public."PaymentHistory"
  add constraint payment_history_manual_fields_check
  check (
    entry_source <> 'manual'
    or (
      payment_method_type in ('manual_credit_card', 'ach', 'check')
      and recorded_by_user_uuid is not null
      and stripe_checkout_session_id is null
      and stripe_payment_intent_id is null
    )
  );

-- -------------------------------------------------------------
-- RLS — the authorization boundary
--
-- The write goes through PowerSync's upload connector, which replays the
-- insert to PostgREST under the user's Clerk JWT. So this policy, not the
-- dialog and not the button's disabled prop, is what actually decides who may
-- record a payment.
--
-- Gated on ROLE, never on ownership. That is deliberate: a lead account
-- manager may record a payment on any quote, and expressing "the quotes I
-- created" here would need a join to Events inside `with check` on every
-- insert. The narrower limit that applies to a junior AM is enforced in the
-- UI by the same `canEdit` that governs every other control on the page.
--
-- What this does NOT enforce, stated so nobody reads more into it: it does not
-- pin recorded_by_user_uuid to the caller. There is no in-policy expression
-- for "the Users.id of the current caller" in this schema, so an account
-- manager could attribute a row to a colleague. That is misattribution on a
-- row they are already allowed to create, not an escalation, and it is the
-- same trust level as created_by_user_uuid elsewhere in this codebase.
--
-- No UPDATE and no DELETE policy, for anyone. The service role continues to
-- bypass RLS for the webhook.
-- -------------------------------------------------------------

create policy "payment_history_insert" on public."PaymentHistory"
  as permissive for insert to authenticated
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
    and entry_source = 'manual'
  );
