-- StripeConnections: multiple Stripe accounts, managed in-app.
--
-- No token column by design — the platform key + Stripe-Account header is
-- sufficient, so storing OAuth tokens would only add credential-leak risk.

create table public."StripeConnections" (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone,

  -- Nullable: row is created as a placeholder before OAuth completes.
  stripe_account_id text,

  details_submitted boolean not null default false,
  charges_enabled   boolean not null default false,
  payouts_enabled   boolean not null default false,
  livemode          boolean not null default false,
  stripe_business_name text,

  constraint StripeConnections_pkey primary key (id)
);

-- Partial unique: allows reconnecting the same account after a soft delete.
create unique index "StripeConnections_stripe_account_id_unique"
  on public."StripeConnections" (stripe_account_id)
  where deleted_at is null;

alter table public."StripeConnections" enable row level security;

-- Admin-only. Do NOT add a `deleted_at is null` filter here: Postgres refuses
-- an UPDATE that would move a row out of its own SELECT policy, so filtering
-- deleted rows in USING makes the soft-delete write itself fail with "new row
-- violates row-level security policy". Soft-deleted rows must also stay
-- readable so the "removed connections" view can list and restore them. The
-- app filters active vs. deleted in its query, not here (same as StorageLocations).
create policy "rbac_select" on public."StripeConnections"
  as permissive for select to authenticated
  using (public.get_user_roles() && ARRAY['admin']::text[]);

create policy "rbac_insert" on public."StripeConnections"
  as permissive for insert to authenticated
  with check (public.get_user_roles() && ARRAY['admin']::text[]);

create policy "rbac_update" on public."StripeConnections"
  as permissive for update to authenticated
  using (public.get_user_roles() && ARRAY['admin']::text[]);

create index if not exists "StripeConnections_stripe_account_id_idx"
  on public."StripeConnections" using btree (stripe_account_id);

-- Link a sales office to the Stripe connection its payments route through.
-- Mirrors the existing quickbook_uuid link on SalesOffices. Nullable: offices
-- without a Stripe connection fall back to the default account.
alter table public."SalesOffices"
  add column if not exists stripe_connection_uuid uuid
  references public."StripeConnections"(id);

create index if not exists "SalesOffices_stripe_connection_uuid_idx"
  on public."SalesOffices" using btree (stripe_connection_uuid);
