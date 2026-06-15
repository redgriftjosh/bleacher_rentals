-- Add field_name and action_type columns to EventChangeLog
alter table "EventChangeLog" add column if not exists field_name text;
alter table "EventChangeLog" add column if not exists action_type text not null default 'update';
