create table public."Notifications" (
  id uuid not null default gen_random_uuid () primary key,
  created_at timestamptz not null default now(),
  user_id uuid not null references public."Users"(id) on delete cascade,
  title text not null default '',
  body text not null
);

alter table public."Notifications" enable row level security;

create policy "Users can read their notifications"
on public."Notifications"
for select
using (
  user_id = (
    select id
    from public."Users"
    where clerk_user_id = current_setting('request.jwt.claim.sub', true)
  )
);

-- Enable the pg_net extension for HTTP requests
create extension if not exists pg_net with schema extensions;

-- Create a function to call the edge function
create or replace function public.handle_new_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  webhook_url text;
  service_role_key text;
begin
  -- For local development
  webhook_url := 'http://host.docker.internal:54321/functions/v1/push';
  service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
  
  -- Make async HTTP request to edge function
  perform net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'Notifications',
      'record', row_to_json(NEW),
      'schema', 'public',
      'old_record', null
    )
  );
  
  return NEW;
end;
$$;

-- Drop trigger if it exists
drop trigger if exists on_notification_created on public."Notifications";

-- Create the trigger
create trigger on_notification_created
  after insert on public."Notifications"
  for each row
  execute function public.handle_new_notification();

  -- Add expo_push_token column to Users table
alter table public."Users" 
add column if not exists expo_push_token text;