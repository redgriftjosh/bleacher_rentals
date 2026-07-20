-- Soft delete for maintenance/repair events: admins can hide events and
-- recover them later from the Repairs page (mirrors DamageReports).
alter table public."MaintenanceEvents"
  add column if not exists deleted boolean not null default false;

create index if not exists "MaintenanceEvents_deleted_idx"
  on public."MaintenanceEvents" using btree (deleted) tablespace pg_default;
