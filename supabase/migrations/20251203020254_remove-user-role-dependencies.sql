-- Add driver_id column
alter table "public"."WorkTrackers" add column "driver_id" bigint;

-- Backfill driver_id from Drivers table based on user_id
update "public"."WorkTrackers" wt
set driver_id = d.driver_id
from "public"."Drivers" d
where wt.user_id = d.user_id;

-- Add foreign key constraint
alter table "public"."WorkTrackers" add constraint "WorkTrackers_driver_id_fkey" 
  FOREIGN KEY (driver_id) REFERENCES "public"."Drivers"(driver_id);

-- Create index for foreign key performance
create index if not exists "WorkTrackers_driver_id_idx" on "public"."WorkTrackers" using btree (driver_id);

-- Function to keep user_id and driver_id in sync
create or replace function sync_worktracker_user_driver()
returns trigger as $$
begin
  -- Handle INSERT
  if TG_OP = 'INSERT' then
    if NEW.driver_id is not null then
      -- Derive user_id from driver_id
      select user_id into NEW.user_id
      from "public"."Drivers"
      where driver_id = NEW.driver_id;
    elsif NEW.user_id is not null then
      -- Derive driver_id from user_id
      select driver_id into NEW.driver_id
      from "public"."Drivers"
      where user_id = NEW.user_id;
    end if;

  -- Handle UPDATE
  elsif TG_OP = 'UPDATE' then
    -- If driver_id changed, sync user_id from driver_id
    if NEW.driver_id is distinct from OLD.driver_id then
      if NEW.driver_id is not null then
        select user_id into NEW.user_id
        from "public"."Drivers"
        where driver_id = NEW.driver_id;
      else
        NEW.user_id := null;
      end if;

    -- Else if user_id changed, sync driver_id from user_id
    elsif NEW.user_id is distinct from OLD.user_id then
      if NEW.user_id is not null then
        select driver_id into NEW.driver_id
        from "public"."Drivers"
        where user_id = NEW.user_id;
      else
        NEW.driver_id := null;
      end if;
    end if;
  end if;

  return NEW;
end;
$$ language plpgsql;

-- Create trigger to sync user_id and driver_id on insert or update
create trigger sync_worktracker_user_driver_trigger
before insert or update on "public"."WorkTrackers"
for each row
execute function sync_worktracker_user_driver();