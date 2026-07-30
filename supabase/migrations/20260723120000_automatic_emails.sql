-- Automatic emails: per-sales-office trigger bindings + scoped templates.
--
--  * EmailTriggerBindings — "for this office + trigger, it is on/off."
--                          One row per (office, trigger). The trigger *types*
--                          live in code (src/features/automaticEmails/triggers.ts).
--                          A binding row exists only once configured.
--  * EmailTemplates       — email content (subject + HTML) scoped to a single
--                          binding. Many draft templates can exist per binding;
--                          at most one may be marked is_active (= the one that
--                          will be sent). Templates are NOT shared across offices
--                          or triggers — copy the HTML to reuse content elsewhere.

-- ── Trigger bindings (per sales office) ──────────────────────────────────────
-- Created first: EmailTemplates FKs into this table.
create table public."EmailTriggerBindings" (
  id uuid primary key default gen_random_uuid(),
  sales_office_uuid uuid not null references public."SalesOffices"(id) on delete cascade,

  -- Matches a key in the code-side trigger registry, e.g. 'quote_signed_client'.
  trigger text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create unique index "EmailTriggerBindings_office_trigger_unique"
  on public."EmailTriggerBindings" (sales_office_uuid, trigger);

-- ── Templates (scoped to a binding) ──────────────────────────────────────────
create table public."EmailTemplates" (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  subject text not null default '',
  html_body text not null default '',

  -- The binding this template belongs to. Cascade-delete so templates are
  -- cleaned up when a binding (or its parent office) is removed.
  trigger_uuid uuid not null references public."EmailTriggerBindings"(id) on delete cascade,

  -- At most one template per binding may be active (= the one that will send).
  -- 0 active templates is allowed; more than 1 is prevented by the index below.
  is_active boolean not null default false,

  created_at timestamptz not null default now(),
  created_by_user_uuid uuid references public."Users"(id),
  updated_at timestamptz,
  edited_by_user_uuid uuid references public."Users"(id),
  deleted_at timestamptz,
  error_message text
);

-- Fast lookup of non-deleted templates for a binding, active ones first.
create index "EmailTemplates_trigger_uuid_idx"
  on public."EmailTemplates" (trigger_uuid, is_active)
  where deleted_at is null;

-- Enforce: at most one active (non-deleted) template per binding.
create unique index "EmailTemplates_one_active_per_binding"
  on public."EmailTemplates" (trigger_uuid)
  where is_active = true and deleted_at is null;

-- ── RLS: admin-only, mirroring StripeConnections ──────────────────────────────
alter table public."EmailTriggerBindings" enable row level security;
alter table public."EmailTemplates" enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['EmailTriggerBindings', 'EmailTemplates']
  loop
    execute format(
      'create policy "rbac_select" on public.%I as permissive for select to authenticated using (public.get_user_roles() && ARRAY[''admin'']::text[]);', t);
    execute format(
      'create policy "rbac_insert" on public.%I as permissive for insert to authenticated with check (public.get_user_roles() && ARRAY[''admin'']::text[]);', t);
    execute format(
      'create policy "rbac_update" on public.%I as permissive for update to authenticated using (public.get_user_roles() && ARRAY[''admin'']::text[]);', t);
    execute format(
      'create policy "rbac_delete" on public.%I as permissive for delete to authenticated using (public.get_user_roles() && ARRAY[''admin'']::text[]);', t);
  end loop;
end $$;

-- ── Automated email send log ──────────────────────────────────────────────────
-- Immutable audit trail: one row per trigger fire attempt, written by the
-- service-role API route. Readable by all internal roles; never mutated by
-- client code (service role bypasses RLS for inserts).

create type public.email_send_status as enum ('sent', 'failed');

create table public."EventEmailLog" (
  id uuid primary key default gen_random_uuid(),

  -- The booking this email was fired for.
  event_uuid uuid not null references public."Events"(id) on delete cascade,

  -- Matches a key in the code-side trigger registry, e.g. 'quote_signed_client'.
  trigger text not null,

  status public.email_send_status not null,

  -- Null on success. On failure: the SendResult.reason string
  -- (e.g. 'no_binding', 'binding_inactive', 'no_recipient_email').
  reason text,

  -- The address the email was sent to. Null when we never resolved a recipient.
  to_email text,

  -- Which template was rendered. Null when the send failed before a template
  -- was selected.
  template_id uuid references public."EmailTemplates"(id) on delete set null,

  fired_at timestamptz not null default now()
);

create index "EventEmailLog_event_uuid_idx" on public."EventEmailLog" (event_uuid, fired_at desc);

-- RLS: all internal roles can view; writes are service-role only (no client policies).
alter table public."EventEmailLog" enable row level security;

create policy "rbac_select" on public."EventEmailLog"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && ARRAY['admin', 'account_manager', 'viewer']::text[]
  );

-- ── Email template attachments ─────────────────────────────────────────────────
-- Files that are attached to every send of a given template (e.g. a W9,
-- insurance cert, or other document). Cascade-delete with their template so
-- orphans are cleaned up automatically.
create table public."EmailTemplateAttachments" (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public."EmailTemplates"(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  file_size_bytes bigint,
  created_at timestamptz not null default now(),
  created_by_user_uuid uuid references public."Users"(id)
);

create index "EmailTemplateAttachments_template_id_idx"
  on public."EmailTemplateAttachments" (template_id);

-- RLS: admin-only, same as other email tables.
alter table public."EmailTemplateAttachments" enable row level security;

do $$
begin
  execute $p$create policy "rbac_select" on public."EmailTemplateAttachments"
    as permissive for select to authenticated
    using (public.get_user_roles() && ARRAY['admin']::text[]);$p$;
  execute $p$create policy "rbac_insert" on public."EmailTemplateAttachments"
    as permissive for insert to authenticated
    with check (public.get_user_roles() && ARRAY['admin']::text[]);$p$;
  execute $p$create policy "rbac_update" on public."EmailTemplateAttachments"
    as permissive for update to authenticated
    using (public.get_user_roles() && ARRAY['admin']::text[]);$p$;
  execute $p$create policy "rbac_delete" on public."EmailTemplateAttachments"
    as permissive for delete to authenticated
    using (public.get_user_roles() && ARRAY['admin']::text[]);$p$;
end $$;

-- ── Storage bucket: email-attachments ─────────────────────────────────────────
-- Private bucket for files attached to email templates (W9s, certs, etc.).
-- Admins may insert and read. No updates or deletes.
-- insert into storage.buckets (id, name, public)
--   values ('email-attachments', 'email-attachments', false)
--   on conflict (id) do nothing;

create policy "email_attachments_insert"
  on storage.objects as permissive for insert to authenticated
  with check (
    bucket_id = 'email-attachments'
    and public.get_user_roles() && ARRAY['admin']::text[]
  );

create policy "email_attachments_select"
  on storage.objects as permissive for select to authenticated
  using (
    bucket_id = 'email-attachments'
    and public.get_user_roles() && ARRAY['admin']::text[]
  );
