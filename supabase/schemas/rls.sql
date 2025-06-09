-- create policy "Allow All for Auth" on UserHomeBases to "authenticated" using (true);
-- create policy "Allow All for Auth" on Addresses to "authenticated" using (true);
-- create policy "Allow All for Auth" on Bleachers to "authenticated" using (true);
-- create policy "Allow All for Auth" on Events to "authenticated" using (true);
-- create policy "Allow All for Auth" on HomeBases to "authenticated" using (true);
-- create policy "Allow All for Auth" on Users to "authenticated" using (true);
-- create policy "Allow All for Auth" on UserRoles to "authenticated" using (true);
-- create policy "Allow All for Auth" on UserStatuses to "authenticated" using (true);
-- create policy "Allow All for Auth" on BleacherEvents to "authenticated" using (true);

create policy "Allow All for Auth"on UserHomeBases as PERMISSIVE for ALL to authenticated using (true);
create policy "Allow All for Auth"on Addresses as PERMISSIVE for ALL to authenticated using (true);
create policy "Allow All for Auth"on Bleachers as PERMISSIVE for ALL to authenticated using (true);
create policy "Allow All for Auth"on Events as PERMISSIVE for ALL to authenticated using (true);
create policy "Allow All for Auth"on HomeBases as PERMISSIVE for ALL to authenticated using (true);
create policy "Allow All for Auth"on Users as PERMISSIVE for ALL to authenticated using (true);
create policy "Allow All for Auth"on UserRoles as PERMISSIVE for ALL to authenticated using (true);
create policy "Allow All for Auth"on UserStatuses as PERMISSIVE for ALL to authenticated using (true);
create policy "Allow All for Auth"on BleacherEvents as PERMISSIVE for ALL to authenticated using (true);