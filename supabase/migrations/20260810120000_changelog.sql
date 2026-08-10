-- ============================================================================
-- Release changelog.
--
-- ChangeLog holds one row per released version, body_md is developer-authored
-- markdown committed to versions/<version>.md and inserted by CI on merge.
-- Users.changelog_last_read_at drives the "new releases" indicator.
--
-- Spec: docs/specs/changelog.md
-- ============================================================================

create table public."ChangeLog" (
  id          uuid primary key default gen_random_uuid(),
  version     text        not null unique,
  released_at timestamptz not null default now(),
  body_md     text        not null
);

comment on table public."ChangeLog" is
  'One row per released version. Written by CI (service role) on merge to develop/staging/main.';
comment on column public."ChangeLog".version is
  'Semver major.minor.patch, matches package.json and the versions/<version>.md filename.';
comment on column public."ChangeLog".released_at is
  'When THIS environment received the release, not when it was authored.';

create index "ChangeLog_released_at_idx" on public."ChangeLog" (released_at desc);

alter table public."ChangeLog" enable row level security;

-- Every authenticated user reads the changelog. Nobody writes via PostgREST:
-- inserts come from CI with the service role key, which bypasses RLS.
create policy "changelog_select" on public."ChangeLog"
  as permissive for select to authenticated
  using (true);

alter table public."Users"
  add column changelog_last_read_at timestamptz;

comment on column public."Users".changelog_last_read_at is
  'Last time the user opened /changelog. Null means they have never opened it.';
