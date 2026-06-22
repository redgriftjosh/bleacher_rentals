-- Relax EventLineItems RLS policies so any account_manager can
-- delete/insert/update line items on any event (not only items they created).
-- App-level permissions (canEditOwnedEntity) already enforce who may edit a quote.
-- The previous created_by_user_uuid check caused silent delete failures when
-- a different AM edited a quote, resulting in line-item duplication.

drop policy if exists "event_line_items_delete" on public."EventLineItems";
create policy "event_line_items_delete" on public."EventLineItems"
  as permissive for delete to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

drop policy if exists "event_line_items_insert" on public."EventLineItems";
create policy "event_line_items_insert" on public."EventLineItems"
  as permissive for insert to authenticated
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );

drop policy if exists "event_line_items_update" on public."EventLineItems";
create policy "event_line_items_update" on public."EventLineItems"
  as permissive for update to authenticated
  using (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  )
  with check (
    public.get_user_roles() && '{admin,account_manager}'::text[]
  );
