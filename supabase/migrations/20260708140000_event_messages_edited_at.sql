-- Track when an internal chat message was last edited.
alter table public."EventMessages"
  add column edited_at timestamptz;
