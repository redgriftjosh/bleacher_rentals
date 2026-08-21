alter table public."Drivers"
  add column if not exists setup_cents integer not null default 5000,
  add column if not exists teardown_cents integer not null default 5000;
