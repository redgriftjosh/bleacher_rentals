-- Link replies to the message they respond to (Telegram-style threads in one chat).
alter table public."EventMessages"
  add column reply_to_message_id uuid references public."EventMessages"(id) on delete set null;

create index event_messages_reply_to_message_id_idx
  on public."EventMessages" (reply_to_message_id)
  where reply_to_message_id is not null;
