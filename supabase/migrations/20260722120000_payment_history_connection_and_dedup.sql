-- PaymentHistory: traceability to the connected account + webhook idempotency.

-- Which Stripe connection (office account) processed the payment. Nullable:
-- older rows and any non-Connect payment have none. FK, but never cascades --
-- connections are soft-deleted, so the row always survives for reporting.
alter table public."PaymentHistory"
  add column if not exists stripe_connection_uuid uuid
    references public."StripeConnections" (id);

create index if not exists "idx_payment_history_stripe_connection"
  on public."PaymentHistory" using btree (stripe_connection_uuid);

-- Idempotency guard. Stripe retries webhook deliveries, so the same checkout
-- session can arrive more than once; without this a retry would insert a second
-- PaymentHistory row and double-count the money. One session = one payment, so
-- the session id is unique. Partial (WHERE NOT NULL) because manually recorded
-- payments have no session id and must not collide.
create unique index if not exists "uq_payment_history_checkout_session"
  on public."PaymentHistory" using btree (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
