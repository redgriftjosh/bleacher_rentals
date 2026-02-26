drop policy if exists "Users can read their notifications"
on public."Notifications";

drop policy if exists "Allow All for Auth"
on public."Notifications";

create policy "Allow All for Auth"
	on public."Notifications"
	as permissive
	for all
	to authenticated
using (true)
with check (true);
