alter table public."WorkTrackerLineItems"
  add column if not exists is_automatically_managed boolean not null default false;
