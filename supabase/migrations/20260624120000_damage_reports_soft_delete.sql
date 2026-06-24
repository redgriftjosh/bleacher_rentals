-- Soft delete for damage reports: admins can hide reports and recover them later.
alter table public."DamageReports"
  add column if not exists deleted boolean not null default false;

create index if not exists "DamageReports_deleted_idx"
  on public."DamageReports" using btree (deleted) tablespace pg_default;
