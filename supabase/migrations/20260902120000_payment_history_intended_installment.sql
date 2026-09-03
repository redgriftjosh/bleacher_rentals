-- =============================================================
-- PaymentHistory.intended_installment_id
--
-- Which installment the client was actually paying for, recorded at the moment
-- they paid. `installment_id` is the live link the allocation reads and can be
-- re-pointed as a schedule changes; this column is the historical fact and is
-- never rewritten.
--
-- Deliberately NO foreign key: it must survive whatever happens to the
-- installment it names. Deleting an installment that still has money against it
-- stays refused by the `installment_id` FK (no ON DELETE clause) — see
-- docs/specs/payment-accounting-truth.md §4.1.
-- =============================================================

alter table public."PaymentHistory"
  add column if not exists intended_installment_id uuid;

comment on column public."PaymentHistory".intended_installment_id is
  'The installment this payment was made against, as of the payment. Historical; never nulled or re-pointed.';

-- Existing rows: what they point at now is what they were paid against.
update public."PaymentHistory"
   set intended_installment_id = installment_id
 where intended_installment_id is null
   and installment_id is not null;
