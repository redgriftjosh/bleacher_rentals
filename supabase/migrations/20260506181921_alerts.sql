create type public.alert_entity_type as enum ('event');

create table public."Alerts" (
  id uuid not null default gen_random_uuid(),
  entity_uuid uuid not null,
  entity_type public.alert_entity_type not null,
  title text null,
  message text null,
  entity_description text null,
  created_at timestamp with time zone not null default now(),
  constraint Alerts_pkey primary key (id),
  constraint Alerts_id_key unique (id)
) tablespace pg_default;

alter table public."Alerts" enable row level security;

create policy "Allow all for authenticated users"
  on public."Alerts"
  for all
  to authenticated
  using (true)
  with check (true);

create table public."UserAlerts" (
  id uuid not null default gen_random_uuid(),
  user_uuid uuid not null,
  alert_uuid uuid not null,
  dismissed boolean not null default false,
  dismissed_until date null,
  created_at timestamp with time zone not null default now(),
  constraint UserAlerts_pkey primary key (id),
  constraint UserAlerts_id_key unique (id),
  constraint UserAlerts_user_uuid_fkey foreign key (user_uuid) references "Users" (id),
  constraint UserAlerts_alert_uuid_fkey foreign key (alert_uuid) references "Alerts" (id)
) tablespace pg_default;

alter table public."UserAlerts" enable row level security;

create policy "Allow all for authenticated users"
  on public."UserAlerts"
  for all
  to authenticated
  using (true)
  with check (true);
