-- Add bleacher_type_uuid FK to Bleachers
alter table public."Bleachers"
  add column bleacher_type_uuid uuid null
  references public."BleacherTypes" (id);

-- Seed BleacherTypes from distinct bleacher_rows values (skip if already exists)
insert into public."BleacherTypes" (name, row_count)
select
  concat(bleacher_rows, ' Row'),
  bleacher_rows
from (
  select distinct bleacher_rows from public."Bleachers"
) as distinct_rows
where not exists (
  select 1 from public."BleacherTypes" bt
  where bt.row_count = distinct_rows.bleacher_rows
    and bt.deleted = false
);

-- Auto-assign bleacher_type_uuid by matching row_count
update public."Bleachers" b
set bleacher_type_uuid = bt.id
from public."BleacherTypes" bt
where bt.row_count = b.bleacher_rows
  and bt.deleted = false
  and b.bleacher_type_uuid is null;
