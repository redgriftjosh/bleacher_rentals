create table if not exists "PaymentHistory" (
  id uuid primary key default gen_random_uuid(),
  event_uuid uuid not null references "Events"(id),
  installment_id uuid references "PaymentInstallments"(id),
  amount_cents integer not null,
  currency text not null default 'USD',
  status text not null default 'pending',
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  stripe_receipt_url text,
  payment_method_type text,
  payer_name text not null,
  payer_email text,
  notes text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_payment_history_event on "PaymentHistory"(event_uuid);
create index idx_payment_history_installment on "PaymentHistory"(installment_id);

-- powersync publication is FOR ALL TABLES, no need to add explicitly
