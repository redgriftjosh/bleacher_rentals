-- Add is_viewer column to Users table.
-- Viewers get read-only access to a subset of tables.
-- Role detection is handled by get_user_roles() in role_accessibility_policy.
alter table public."Users"
  add column if not exists is_viewer boolean not null default false;
