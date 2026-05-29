-- =============================================================
-- Companies & Contacts
--
-- created_by_user_uuid: auto-set via DEFAULT get_current_user_uuid() — no trigger needed
-- created_at: auto-set via DEFAULT now() (Supabase is always UTC) — no trigger needed
-- deleted: soft-delete flag; no hard DELETE policies on either table
--
-- Policies (both tables):
--   SELECT: admin, account_manager, viewer
--   INSERT: admin, account_manager
--   UPDATE: admin, account_manager (any record — no ownership restriction)
-- =============================================================

-- =====================
-- Companies
-- =====================
create table public."Companies" (
  id                    uuid        primary key default gen_random_uuid(),
  company_name          text        not null,
  phone                 text,
  billing_address_uuid  uuid        references public."Addresses"(id),
  shipping_address_uuid uuid        references public."Addresses"(id),
  email                 text,
  notes                 text,
  deleted               boolean     not null default false,
  created_by_user_uuid  uuid        references public."Users"(id) 
                          default public.get_current_user_uuid(),
  created_at            timestamptz not null default now()
);

alter table public."Companies" enable row level security;

create policy "companies_select" on public."Companies"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "companies_insert" on public."Companies"
  as permissive for insert to authenticated
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

create policy "companies_update" on public."Companies"
  as permissive for update to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  )
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

-- =====================
-- Contacts
-- =====================
create table public."Contacts" (
  id                   uuid        primary key default gen_random_uuid(),
  company_uuid         uuid        references public."Companies"(id) ,
  first_name           text        not null,
  last_name            text,
  phone                text,
  email                text,
  notes                text,
  deleted              boolean     not null default false,
  created_by_user_uuid uuid        references public."Users"(id) 
                         default public.get_current_user_uuid(),
  created_at           timestamptz not null default now()
);

alter table public."Contacts" enable row level security;

create policy "contacts_select" on public."Contacts"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "contacts_insert" on public."Contacts"
  as permissive for insert to authenticated
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

create policy "contacts_update" on public."Contacts"
  as permissive for update to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  )
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

-- =====================
-- SalesOffices
-- =====================
create table public."SalesOffices" (
  id                   uuid        primary key default gen_random_uuid(),
  name                 text        not null,
  address_uuid         uuid        references public."Addresses"(id),
  deleted              boolean     not null default false,
  created_by_user_uuid uuid        references public."Users"(id)
                         default public.get_current_user_uuid(),
  created_at           timestamptz not null default now()
);

alter table public."SalesOffices" enable row level security;

create policy "sales_offices_select" on public."SalesOffices"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "sales_offices_insert" on public."SalesOffices"
  as permissive for insert to authenticated
  with check (
    'admin' = any(public.get_user_roles())
  );

create policy "sales_offices_update" on public."SalesOffices"
  as permissive for update to authenticated
  using (
    'admin' = any(public.get_user_roles())
  )
  with check (
    'admin' = any(public.get_user_roles())
  );

-- =====================
-- BleacherTypes
-- =====================
create table public."BleacherTypes" (
  id                   uuid        primary key default gen_random_uuid(),
  name                 text        not null,
  row_count            integer     not null,
  deleted              boolean     not null default false,
  created_by_user_uuid uuid        references public."Users"(id)
                         default public.get_current_user_uuid(),
  created_at           timestamptz not null default now()
);

alter table public."BleacherTypes" enable row level security;

create policy "bleacher_types_select" on public."BleacherTypes"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "bleacher_types_insert" on public."BleacherTypes"
  as permissive for insert to authenticated
  with check (
    'admin' = any(public.get_user_roles())
  );

create policy "bleacher_types_update" on public."BleacherTypes"
  as permissive for update to authenticated
  using (
    'admin' = any(public.get_user_roles())
  )
  with check (
    'admin' = any(public.get_user_roles())
  );

create policy "bleacher_types_delete" on public."BleacherTypes"
  as permissive for delete to authenticated
  using (
    'admin' = any(public.get_user_roles())
  );

-- =====================
-- PriceDurations
-- =====================
create table public."PriceDurations" (
  id                   uuid        primary key default gen_random_uuid(),
  name                 text        not null,
  min_days             integer     not null,
  max_days             integer     not null,
  deleted              boolean     not null default false,
  created_by_user_uuid uuid        references public."Users"(id)
                         default public.get_current_user_uuid(),
  created_at           timestamptz not null default now()
);

alter table public."PriceDurations" enable row level security;

create policy "price_durations_select" on public."PriceDurations"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "price_durations_insert" on public."PriceDurations"
  as permissive for insert to authenticated
  with check (
    'admin' = any(public.get_user_roles())
  );

create policy "price_durations_update" on public."PriceDurations"
  as permissive for update to authenticated
  using (
    'admin' = any(public.get_user_roles())
  )
  with check (
    'admin' = any(public.get_user_roles())
  );

create policy "price_durations_delete" on public."PriceDurations"
  as permissive for delete to authenticated
  using (
    'admin' = any(public.get_user_roles())
  );

-- =====================
-- EventTypes
-- =====================
create table public."EventTypes" (
  id                   uuid        primary key default gen_random_uuid(),
  name                 text        not null,
  deleted              boolean     not null default false,
  created_by_user_uuid uuid        references public."Users"(id)
                         default public.get_current_user_uuid(),
  created_at           timestamptz not null default now()
);

alter table public."EventTypes" enable row level security;

create policy "event_types_select" on public."EventTypes"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "event_types_insert" on public."EventTypes"
  as permissive for insert to authenticated
  with check (
    'admin' = any(public.get_user_roles())
  );

create policy "event_types_update" on public."EventTypes"
  as permissive for update to authenticated
  using (
    'admin' = any(public.get_user_roles())
  )
  with check (
    'admin' = any(public.get_user_roles())
  );

create policy "event_types_delete" on public."EventTypes"
  as permissive for delete to authenticated
  using (
    'admin' = any(public.get_user_roles())
  );

-- =====================
-- Currency enum
-- =====================
create type public.currency as enum ('USD', 'CAD');

-- =====================
-- Prices
-- =====================
create table public."Prices" (
  id                   uuid            primary key default gen_random_uuid(),
  price_duration_uuid  uuid            not null references public."PriceDurations"(id),
  bleacher_type_uuid   uuid            not null references public."BleacherTypes"(id),
  event_type_uuid      uuid            not null references public."EventTypes"(id),
  price_cents          integer         not null,
  currency             public.currency not null,
  deleted              boolean         not null default false,
  created_by_user_uuid uuid            references public."Users"(id)
                         default public.get_current_user_uuid(),
  created_at           timestamptz     not null default now()
);

alter table public."Prices" enable row level security;

create policy "prices_select" on public."Prices"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "prices_insert" on public."Prices"
  as permissive for insert to authenticated
  with check (
    'admin' = any(public.get_user_roles())
  );

create policy "prices_update" on public."Prices"
  as permissive for update to authenticated
  using (
    'admin' = any(public.get_user_roles())
  )
  with check (
    'admin' = any(public.get_user_roles())
  );

create policy "prices_delete" on public."Prices"
  as permissive for delete to authenticated
  using (
    'admin' = any(public.get_user_roles())
  );

-- =====================
-- EventLineItems
-- =====================
create table public."EventLineItems" (
  id                   uuid          primary key default gen_random_uuid(),
  header               text          not null,
  description          text,
  currency             public.currency not null,
  value_cents          integer       not null,
  is_template          boolean       not null default false,
  quantity             integer,
  event_uuid           uuid          references public."Events"(id),
  bleacher_type_uuid   uuid          references public."BleacherTypes"(id),
  deleted              boolean       not null default false,
  created_by_user_uuid uuid          references public."Users"(id)
                         default public.get_current_user_uuid(),
  created_at           timestamptz   not null default now()
);

alter table public."EventLineItems" enable row level security;

create policy "event_line_items_select" on public."EventLineItems"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

-- admin: any insert; AM: must set created_by = self
create policy "event_line_items_insert" on public."EventLineItems"
  as permissive for insert to authenticated
  with check (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and created_by_user_uuid = public.get_current_user_uuid()
    )
  );

-- admin: any row; AM: only rows they created
create policy "event_line_items_update" on public."EventLineItems"
  as permissive for update to authenticated
  using (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and created_by_user_uuid = public.get_current_user_uuid()
    )
  )
  with check (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and created_by_user_uuid = public.get_current_user_uuid()
    )
  );

-- admin: any row; AM: only rows they created
create policy "event_line_items_delete" on public."EventLineItems"
  as permissive for delete to authenticated
  using (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and created_by_user_uuid = public.get_current_user_uuid()
    )
  );

-- =====================
-- Events: new columns
-- =====================
alter table public."Events"
  add column if not exists event_type_uuid  uuid references public."EventTypes"(id),
  add column if not exists contact_uuid     uuid references public."Contacts"(id),
  add column if not exists internal_notes   text,
  add column if not exists external_notes   text,
  add column if not exists sales_office_uuid uuid references public."SalesOffices"(id);

-- =====================
-- EventMessages
-- =====================
create table public."EventMessages" (
  id                   uuid        primary key default gen_random_uuid(),
  event_uuid           uuid        not null references public."Events"(id),
  user_uuid            uuid        not null references public."Users"(id),
  body                 text        not null,
  is_system            boolean     not null default false,
  created_at           timestamptz not null default now()
);

alter table public."EventMessages" enable row level security;

create policy "event_messages_select" on public."EventMessages"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "event_messages_insert" on public."EventMessages"
  as permissive for insert to authenticated
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

-- admin: any row; AM/others: only own messages
create policy "event_messages_update" on public."EventMessages"
  as permissive for update to authenticated
  using (
    'admin' = any(public.get_user_roles())
    or (
      public.get_user_roles() && '{account_manager}'::text[]
      and user_uuid = public.get_current_user_uuid()
    )
  )
  with check (
    'admin' = any(public.get_user_roles())
    or (
      public.get_user_roles() && '{account_manager}'::text[]
      and user_uuid = public.get_current_user_uuid()
    )
  );

create policy "event_messages_delete" on public."EventMessages"
  as permissive for delete to authenticated
  using (
    'admin' = any(public.get_user_roles())
    or (
      public.get_user_roles() && '{account_manager}'::text[]
      and user_uuid = public.get_current_user_uuid()
    )
  );

-- =====================
-- EventMessageReadReceipts
-- =====================
create table public."EventMessageReadReceipts" (
  id          uuid        primary key default gen_random_uuid(),
  message_id  uuid        not null references public."EventMessages"(id),
  user_uuid   uuid        not null references public."Users"(id),
  read_at     timestamptz not null default now(),
  unique (message_id, user_uuid)
);

alter table public."EventMessageReadReceipts" enable row level security;

create policy "event_message_read_receipts_select" on public."EventMessageReadReceipts"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "event_message_read_receipts_insert" on public."EventMessageReadReceipts"
  as permissive for insert to authenticated
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

create policy "event_message_read_receipts_delete" on public."EventMessageReadReceipts"
  as permissive for delete to authenticated
  using (
    'admin' = any(public.get_user_roles())
    or (
      public.get_user_roles() && '{account_manager}'::text[]
      and user_uuid = public.get_current_user_uuid()
    )
  );

-- =====================
-- EventTypingIndicators
-- =====================
create table public."EventTypingIndicators" (
  id          uuid        primary key default gen_random_uuid(),
  event_uuid  uuid        not null references public."Events"(id),
  user_uuid   uuid        not null references public."Users"(id),
  is_typing   boolean     not null default false,
  updated_at  timestamptz not null default now(),
  unique (event_uuid, user_uuid)
);

alter table public."EventTypingIndicators" enable row level security;

create policy "event_typing_indicators_select" on public."EventTypingIndicators"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "event_typing_indicators_insert" on public."EventTypingIndicators"
  as permissive for insert to authenticated
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

create policy "event_typing_indicators_update" on public."EventTypingIndicators"
  as permissive for update to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager}'::text[]
    and user_uuid = public.get_current_user_uuid()
  )
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
    and user_uuid = public.get_current_user_uuid()
  );

create policy "event_typing_indicators_delete" on public."EventTypingIndicators"
  as permissive for delete to authenticated
  using (
    'admin' = any(public.get_user_roles())
    or (
      public.get_user_roles() && '{account_manager}'::text[]
      and user_uuid = public.get_current_user_uuid()
    )
  );

-- =====================
-- EventSubscriptions
-- =====================
create table public."EventSubscriptions" (
  id                    uuid        primary key default gen_random_uuid(),
  event_uuid            uuid        not null references public."Events"(id),
  account_manager_uuid  uuid        not null references public."AccountManagers"(id),
  created_at            timestamptz not null default now(),
  unique (event_uuid, account_manager_uuid)
);

alter table public."EventSubscriptions" enable row level security;

create policy "event_subscriptions_select" on public."EventSubscriptions"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "event_subscriptions_insert" on public."EventSubscriptions"
  as permissive for insert to authenticated
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

create policy "event_subscriptions_delete" on public."EventSubscriptions"
  as permissive for delete to authenticated
  using (
    'admin' = any(public.get_user_roles())
    or (
      public.get_user_roles() && '{account_manager}'::text[]
      and account_manager_uuid = public.get_current_account_manager_id()
    )
  );

-- =====================
-- PaymentInstallments
-- =====================
create type public.payment_installment_status as enum ('unpaid', 'paid');

create table public."PaymentInstallments" (
  id           uuid                             primary key default gen_random_uuid(),
  event_uuid   uuid                             not null references public."Events"(id),
  due_date     date                             not null,
  status       public.payment_installment_status not null default 'unpaid',
  amount_cents integer                          not null,
  currency     public.currency                  not null,
  paid_at      timestamptz,
  created_at   timestamptz                      not null default now()
);

alter table public."PaymentInstallments" enable row level security;

create policy "payment_installments_select" on public."PaymentInstallments"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "payment_installments_insert" on public."PaymentInstallments"
  as permissive for insert to authenticated
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

-- admin: any row; AM: only installments on events they created
create policy "payment_installments_update" on public."PaymentInstallments"
  as permissive for update to authenticated
  using (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and exists (
        select 1 from public."Events" e
        where e.id = event_uuid
          and e.created_by_user_uuid = public.get_current_user_uuid()
      )
    )
  )
  with check (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and exists (
        select 1 from public."Events" e
        where e.id = event_uuid
          and e.created_by_user_uuid = public.get_current_user_uuid()
      )
    )
  );

create policy "payment_installments_delete" on public."PaymentInstallments"
  as permissive for delete to authenticated
  using (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and exists (
        select 1 from public."Events" e
        where e.id = event_uuid
          and e.created_by_user_uuid = public.get_current_user_uuid()
      )
    )
  );

-- =====================
-- EventAttachments
-- =====================
create table public."EventAttachments" (
  id                   uuid        primary key default gen_random_uuid(),
  event_uuid           uuid        not null references public."Events"(id),
  storage_path         text        not null,
  file_name            text        not null,
  uploaded_by_user_uuid uuid       references public."Users"(id),
  created_at           timestamptz not null default now()
);

alter table public."EventAttachments" enable row level security;

create policy "event_attachments_select" on public."EventAttachments"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "event_attachments_insert" on public."EventAttachments"
  as permissive for insert to authenticated
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

-- admin: any row; AM: only attachments on events they created
create policy "event_attachments_update" on public."EventAttachments"
  as permissive for update to authenticated
  using (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and exists (
        select 1 from public."Events" e
        where e.id = event_uuid
          and e.created_by_user_uuid = public.get_current_user_uuid()
      )
    )
  )
  with check (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and exists (
        select 1 from public."Events" e
        where e.id = event_uuid
          and e.created_by_user_uuid = public.get_current_user_uuid()
      )
    )
  );

create policy "event_attachments_delete" on public."EventAttachments"
  as permissive for delete to authenticated
  using (
    'admin' = any(public.get_user_roles())
    or (
      'account_manager' = any(public.get_user_roles())
      and exists (
        select 1 from public."Events" e
        where e.id = event_uuid
          and e.created_by_user_uuid = public.get_current_user_uuid()
      )
    )
  );

-- =====================
-- EventChangeLog
-- =====================
create table public."EventChangeLog" (
  id                   uuid        primary key default gen_random_uuid(),
  event_uuid           uuid        not null references public."Events"(id),
  prev_value           text,
  next_value           text,
  changed_by_user_uuid uuid        references public."Users"(id),
  changed_at           timestamptz not null default now()
);

alter table public."EventChangeLog" enable row level security;

create policy "event_change_log_select" on public."EventChangeLog"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

-- anyone authenticated can insert; no update or delete policies (immutable log)
create policy "event_change_log_insert" on public."EventChangeLog"
  as permissive for insert to authenticated
  with check (true);


