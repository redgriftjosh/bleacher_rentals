-- Allow the same Linxup device to be assigned to multiple bleachers.
alter table public."Bleachers"
  drop constraint if exists "Bleachers_linxup_device_id_key";
