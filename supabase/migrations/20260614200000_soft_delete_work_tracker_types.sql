alter table public."WorkTrackerTypes"
  add column is_deleted boolean not null default false;
