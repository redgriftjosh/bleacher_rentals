-- @mention rows for internal event chat (one row per mentioned user per message).
create table public."EventMessageMentions" (
  id                  uuid        primary key default gen_random_uuid(),
  message_id          uuid        not null references public."EventMessages"(id) on delete cascade,
  mentioned_user_uuid uuid        not null references public."Users"(id),
  created_at          timestamptz not null default now(),
  unique (message_id, mentioned_user_uuid)
);

create index event_message_mentions_mentioned_user_idx
  on public."EventMessageMentions" (mentioned_user_uuid);

create index event_message_mentions_message_idx
  on public."EventMessageMentions" (message_id);

alter table public."EventMessageMentions" enable row level security;

create policy "event_message_mentions_select" on public."EventMessageMentions"
  as permissive for select to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager,viewer}'::text[]
  );

create policy "event_message_mentions_insert" on public."EventMessageMentions"
  as permissive for insert to authenticated
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

create policy "event_message_mentions_delete" on public."EventMessageMentions"
  as permissive for delete to authenticated
  using (
    'admin' = any(public.get_user_roles())
  );
