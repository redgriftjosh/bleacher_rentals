-- =============================================================
-- PaymentInstallments loses its payment-state cache
--
-- `status` and `paid_at` were a cache of allocatePayments over
-- PaymentHistory. They were never an independent fact, and every
-- screen already recomputes the real numbers at read time
-- (docs/specs/payment-accounting-truth.md §3.7).
--
-- Keeping them cost more than they ever paid for: a $1.00 payment
-- once closed a $3,600.00 installment through `status`, and
-- writing them made a paid quote look edited, which invalidated
-- the client's contract signature. A cache nobody may read is not
-- worth keeping correct.
--
-- What remains on the row is the term itself: how much is owed
-- and when. See docs/specs/payment-does-not-invalidate-signature.md §6.
--
-- The preceding migration already took these columns out of both
-- quote hashes, so dropping them changes no hash and invalidates
-- no signature.
-- =============================================================

ALTER TABLE public."PaymentInstallments"
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS paid_at;
