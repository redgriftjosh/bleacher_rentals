-- ===============================================================================
--                                   AccountManagers
-- ===============================================================================

begin;

-- 1) add uuid "id" column (nullable)
alter table "public"."AccountManagers" add column if not exists id uuid;

-- 2) backfill uuid ids
update "public"."AccountManagers" set id = gen_random_uuid() where id is null;

-- 3) set "id" not null, with default
alter table "public"."AccountManagers" alter column id set not null, alter column id set default gen_random_uuid();

-- 4) make id unique so it can be referenced by a FK
alter table "public"."AccountManagers" drop constraint if exists "AccountManagers_id_key";
alter table "public"."AccountManagers" add constraint "AccountManagers_id_key" unique (id);

-- 5) (on referencing tables) add new null columns to reference new uuid PKs
alter table "public"."Drivers" add column if not exists account_manager_uuid uuid;
alter table "public"."Bleachers" add column if not exists summer_account_manager_uuid uuid;
alter table "public"."Bleachers" add column if not exists winter_account_manager_uuid uuid;

-- 6) (on referencing tables) set value for new uuid columns using the old bigint FK
update "public"."Drivers" ref set account_manager_uuid = curr.id from "public"."AccountManagers" curr where ref.account_manager_id is not null and ref.account_manager_id = curr.account_manager_id;
update "public"."Bleachers" ref set summer_account_manager_uuid = curr.id from "public"."AccountManagers" curr where ref.summer_account_manager_id is not null and ref.summer_account_manager_id = curr.account_manager_id;
update "public"."Bleachers" ref set winter_account_manager_uuid = curr.id from "public"."AccountManagers" curr where ref.winter_account_manager_id is not null and ref.winter_account_manager_id = curr.account_manager_id;

-- 7) add sql from 6) to end of seed.sql, run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
alter table "public"."Drivers" drop constraint if exists "Drivers_account_manager_id_fkey";
alter table "public"."Bleachers" drop constraint if exists "Bleachers_summer_account_manager_id_fkey";
alter table "public"."Bleachers" drop constraint if exists "Bleachers_winter_account_manager_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
alter table "public"."Drivers" add constraint "Drivers_account_manager_uuid_fkey" foreign key (account_manager_uuid) references public."AccountManagers"(id);
alter table "public"."Bleachers" add constraint "Bleachers_summer_account_manager_uuid_fkey" foreign key (summer_account_manager_uuid) references public."AccountManagers"(id);
alter table "public"."Bleachers" add constraint "Bleachers_winter_account_manager_uuid_fkey" foreign key (winter_account_manager_uuid) references public."AccountManagers"(id);

-- 10) (on referencing tables) create indexes on new uuids
create index if not exists "Drivers_account_manager_uuid_idx" on public."Drivers"(account_manager_uuid);
create index if not exists "Bleachers_summer_account_manager_uuid_idx" on public."Bleachers"(summer_account_manager_uuid);
create index if not exists "Bleachers_winter_account_manager_uuid_idx" on public."Bleachers"(winter_account_manager_uuid);

-- 11) (on referencing tables) drop old bigint columns
alter table "public"."Drivers" drop column account_manager_id;
alter table "public"."Bleachers" drop column summer_account_manager_id;
alter table "public"."Bleachers" drop column winter_account_manager_id;

-- 11.5) drop each of these columns in the studio as well so we can generate seed.sql without errors

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
alter table "public"."AccountManagers" drop constraint if exists "AccountManagers_pkey";

-- 13) make new uuid column the primary key
alter table "public"."AccountManagers" add constraint "AccountManagers_pkey" primary key (id);

-- 14) drop old bigint column
alter table "public"."AccountManagers" drop column account_manager_id;

-- 15) Drop old bigint in the studio
-- supabase db dump --local --data-only -f supabase/seed.sql
-- supabase db reset

commit;








-- ===============================================================================
--                                   Addresses
-- ===============================================================================

begin;

-- 1) add uuid "id" column (nullable)
alter table "public"."Addresses" add column if not exists id uuid;

-- 2) backfill uuid ids
update "public"."Addresses" set id = gen_random_uuid() where id is null;

-- 3) set "id" not null, with default
alter table "public"."Addresses" alter column id set not null, alter column id set default gen_random_uuid();

-- 4) make id unique so it can be referenced by a FK
alter table "public"."Addresses" drop constraint if exists "Addresses_id_key";
alter table "public"."Addresses" add constraint "Addresses_id_key" unique (id);

-- 5) (on referencing tables) add new null columns to reference new uuid PKs
alter table "public"."Events" add column if not exists address_uuid uuid;
alter table "public"."WorkTrackers" add column if not exists pickup_address_uuid uuid;
alter table "public"."WorkTrackers" add column if not exists dropoff_address_uuid uuid;

-- 6) (on referencing tables) set value for new uuid columns using the old bigint FK
update "public"."Events" ref set address_uuid = curr.id from "public"."Addresses" curr where ref.address_id is not null and ref.address_id = curr.address_id;
update "public"."WorkTrackers" ref set pickup_address_uuid = curr.id from "public"."Addresses" curr where ref.pickup_address_id is not null and ref.pickup_address_id = curr.address_id;
update "public"."WorkTrackers" ref set dropoff_address_uuid = curr.id from "public"."Addresses" curr where ref.dropoff_address_id is not null and ref.dropoff_address_id = curr.address_id;

-- 7) add sql from 6) to end of seed.sql, run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
alter table "public"."Events" drop constraint if exists "Events_address_id_fkey";
alter table "public"."WorkTrackers" drop constraint if exists "worktrackers_dropoff_address_id_fkey";
alter table "public"."WorkTrackers" drop constraint if exists "worktrackers_pickup_address_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
alter table "public"."Events" add constraint "Events_address_uuid_fkey" foreign key (address_uuid) references public."Addresses"(id);
alter table "public"."WorkTrackers" add constraint "worktrackers_pickup_address_uuid_fkey" foreign key (pickup_address_uuid) references public."Addresses"(id);
alter table "public"."WorkTrackers" add constraint "worktrackers_dropoff_address_uuid_fkey" foreign key (dropoff_address_uuid) references public."Addresses"(id);

-- 10) (on referencing tables) create indexes on new uuids
create index if not exists "Events_address_uuid_idx" on public."Events"(address_uuid);
create index if not exists "WorkTrackers_pickup_address_uuid_idx" on public."WorkTrackers"(pickup_address_uuid);
create index if not exists "WorkTrackers_dropoff_address_uuid_idx" on public."WorkTrackers"(dropoff_address_uuid);

-- 11) (on referencing tables) drop old bigint columns
alter table "public"."Events" drop column address_id;
alter table "public"."WorkTrackers" drop column pickup_address_id;
alter table "public"."WorkTrackers" drop column dropoff_address_id;

-- 11.5) drop each of these columns in the studio as well so we can generate seed.sql without errors

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
alter table "public"."Addresses" drop constraint if exists "Addresses_pkey";

-- 13) make new uuid column the primary key
alter table "public"."Addresses" add constraint "Addresses_pkey" primary key (id);

-- 14) drop old bigint column
alter table "public"."Addresses" drop column address_id;

-- 15) Drop old bigint in the studio
-- supabase db dump --local --data-only -f supabase/seed.sql
-- supabase db reset

commit;








-- ===============================================================================
--                                   BleacherEvents
-- ===============================================================================

begin;

-- 1) add uuid "id" column (nullable)
alter table "public"."BleacherEvents" add column if not exists id uuid;

-- 2) backfill uuid ids
update "public"."BleacherEvents" set id = gen_random_uuid() where id is null;

-- 3) set "id" not null, with default
alter table "public"."BleacherEvents" alter column id set not null, alter column id set default gen_random_uuid();

-- 4) make id unique so it can be referenced by a FK
alter table "public"."BleacherEvents" drop constraint if exists "BleacherEvents_id_key";
alter table "public"."BleacherEvents" add constraint "BleacherEvents_id_key" unique (id);

-- 5) (on referencing tables) add new null columns to reference new uuid PKs
-- alter table "public"."OtherTable" add column if not exists table_uuid uuid;

-- 6) (on referencing tables) set value for new uuid columns using the old bigint FK
-- update "public"."OtherTable" ref set table_uuid = curr.id from "public"."Table" curr where ref.table_id is not null and ref.table_id = curr.table_id;

-- 7) add sql from 6) to end of seed.sql, run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 11.5) drop each of these columns in the studio as well so we can generate seed.sql without errors

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
alter table "public"."BleacherEvents" drop constraint if exists "BleacherEvents_pkey";

-- 13) make new uuid column the primary key
alter table "public"."BleacherEvents" add constraint "BleacherEvents_pkey" primary key (id);

-- 14) drop old bigint column
alter table "public"."BleacherEvents" drop column bleacher_event_id;

-- 15) Drop old bigint in the studio
-- supabase db dump --local --data-only -f supabase/seed.sql
-- supabase db reset

commit;








-- ===============================================================================
--                                   BleacherUsers
-- ===============================================================================

begin;

-- 1) add uuid "id" column (nullable)
alter table "public"."BleacherUsers" add column if not exists id uuid;

-- 2) backfill uuid ids
update "public"."BleacherUsers" set id = gen_random_uuid() where id is null;

-- 3) set "id" not null, with default
alter table "public"."BleacherUsers" alter column id set not null, alter column id set default gen_random_uuid();
    
-- 4) make id unique so it can be referenced by a FK
alter table "public"."BleacherUsers" drop constraint if exists "BleacherUsers_id_key";
alter table "public"."BleacherUsers" add constraint "BleacherUsers_id_key" unique (id);

-- 5) (on referencing tables) add new null columns to reference new uuid PKs
-- alter table "public"."OtherTable" add column if not exists table_uuid uuid;

-- 6) (on referencing tables) set value for new uuid columns using the old bigint FK
-- update "public"."OtherTable" ref set table_uuid = curr.id from "public"."Table" curr where ref.table_id is not null and ref.table_id = curr.table_id;

-- 7) add sql from 6) to end of seed.sql, run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 11.5) drop each of these columns in the studio as well so we can generate seed.sql without errors

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
alter table "public"."BleacherUsers" drop constraint if exists "BleacherUsers_pkey";

-- 13) make new uuid column the primary key
alter table "public"."BleacherUsers" add constraint "BleacherUsers_pkey" primary key (id);

-- 14) drop old bigint column
alter table "public"."BleacherUsers" drop column bleacher_user_id;

-- 15) Drop old bigint in the studio
-- supabase db dump --local --data-only -f supabase/seed.sql
-- supabase db reset

commit;








-- ===============================================================================
--                                   Bleachers
-- ===============================================================================

begin;

-- 1) add uuid "id" column (nullable)
alter table "public"."Bleachers" add column if not exists id uuid;

-- 2) backfill uuid ids
update "public"."Bleachers" set id = gen_random_uuid() where id is null;

-- 3) set "id" not null, with default
alter table "public"."Bleachers" alter column id set not null, alter column id set default gen_random_uuid();

-- 4) make id unique so it can be referenced by a FK
alter table "public"."Bleachers" drop constraint if exists "Bleachers_id_key";
alter table "public"."Bleachers" add constraint "Bleachers_id_key" unique (id);

-- 5) (on referencing tables) add new null columns to reference new uuid PKs
alter table "public"."BleacherUsers" add column if not exists bleacher_uuid uuid;
alter table "public"."Blocks" add column if not exists bleacher_uuid uuid;
alter table "public"."BleacherEvents" add column if not exists bleacher_uuid uuid;
alter table "public"."WorkTrackers" add column if not exists bleacher_uuid uuid;

-- 6) (on referencing tables) set value for new uuid columns using the old bigint FK
update "public"."BleacherUsers" ref set bleacher_uuid = curr.id from "public"."Bleachers" curr where ref.bleacher_id is not null and ref.bleacher_id = curr.bleacher_id;
update "public"."Blocks" ref set bleacher_uuid = curr.id from "public"."Bleachers" curr where ref.bleacher_id is not null and ref.bleacher_id = curr.bleacher_id;
update "public"."BleacherEvents" ref set bleacher_uuid = curr.id from "public"."Bleachers" curr where ref.bleacher_id is not null and ref.bleacher_id = curr.bleacher_id;
update "public"."WorkTrackers" ref set bleacher_uuid = curr.id from "public"."Bleachers" curr where ref.bleacher_id is not null and ref.bleacher_id = curr.bleacher_id;


-- 7) add sql from 6) to end of seed.sql, run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
alter table "public"."BleacherUsers" drop constraint if exists "BleacherUsers_bleacher_id_fkey";
alter table "public"."Blocks" drop constraint if exists "block_bleacher_id_fkey";
alter table "public"."BleacherEvents" drop constraint if exists "BleacherEvents_bleacher_id_fkey";
alter table "public"."WorkTrackers" drop constraint if exists "worktrackers_bleacher_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
alter table "public"."BleacherUsers" add constraint "BleacherUsers_bleacher_uuid_fkey" foreign key (bleacher_uuid) references public."Bleachers"(id);
alter table "public"."Blocks" add constraint "Blocks_bleacher_uuid_fkey" foreign key (bleacher_uuid) references public."Bleachers"(id);
alter table "public"."BleacherEvents" add constraint "BleacherEvents_bleacher_uuid_fkey" foreign key (bleacher_uuid) references public."Bleachers"(id);
alter table "public"."WorkTrackers" add constraint "WorkTrackers_bleacher_uuid_fkey" foreign key (bleacher_uuid) references public."Bleachers"(id);

-- 10) (on referencing tables) create indexes on new uuids
create index if not exists "BleacherUsers_bleacher_uuid_idx" on public."BleacherUsers"(bleacher_uuid);
create index if not exists "Blocks_bleacher_uuid_idx" on public."Blocks"(bleacher_uuid);
create index if not exists "BleacherEvents_bleacher_uuid_idx" on public."BleacherEvents"(bleacher_uuid);
create index if not exists "WorkTrackers_bleacher_uuid_idx" on public."WorkTrackers"(bleacher_uuid);

-- 11) (on referencing tables) drop old bigint columns
alter table "public"."BleacherUsers" drop column bleacher_id;
alter table "public"."Blocks" drop column bleacher_id;
alter table "public"."BleacherEvents" drop column bleacher_id;
alter table "public"."WorkTrackers" drop column bleacher_id;

-- 11.5) drop each of these columns in the studio as well so we can generate seed.sql without errors

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
alter table "public"."Bleachers" drop constraint if exists "Bleachers_pkey";

-- 13) make new uuid column the primary key
alter table "public"."Bleachers" add constraint "Bleachers_pkey" primary key (id);

-- 14) drop old bigint column
alter table "public"."Bleachers" drop column bleacher_id;

-- 15) Drop old bigint in the studio
-- supabase db dump --local --data-only -f supabase/seed.sql
-- supabase db reset

commit;








-- ===============================================================================
--                                   AccountManagers
-- ===============================================================================

begin;

-- 1) add uuid "id" column (nullable)
-- alter table "public"."Table" add column if not exists id uuid;

-- 2) backfill uuid ids
-- update "public"."Table" set id = gen_random_uuid() where id is null;

-- 3) set "id" not null, with default
-- alter table "public"."Table" alter column id set not null, alter column id set default gen_random_uuid();

-- 4) make id unique so it can be referenced by a FK
-- alter table "public"."Table" drop constraint if exists "Table_id_key";
-- alter table "public"."Table" add constraint "Table_id_key" unique (id);

-- 5) (on referencing tables) add new null columns to reference new uuid PKs
-- alter table "public"."OtherTable" add column if not exists table_uuid uuid;

-- 6) (on referencing tables) set value for new uuid columns using the old bigint FK
-- update "public"."OtherTable" ref set table_uuid = curr.id from "public"."Table" curr where ref.table_id is not null and ref.table_id = curr.table_id;

-- 7) add sql from 6) to end of seed.sql, run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 11.5) drop each of these columns in the studio as well so we can generate seed.sql without errors

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

-- 15) Drop old bigint in the studio
-- supabase db dump --local --data-only -f supabase/seed.sql
-- supabase db reset

commit;








-- ===============================================================================
--                                   AccountManagers
-- ===============================================================================

begin;

-- 1) add uuid "id" column (nullable)
-- alter table "public"."Table" add column if not exists id uuid;

-- 2) backfill uuid ids
-- update "public"."Table" set id = gen_random_uuid() where id is null;

-- 3) set "id" not null, with default
-- alter table "public"."Table" alter column id set not null, alter column id set default gen_random_uuid();

-- 4) make id unique so it can be referenced by a FK
-- alter table "public"."Table" drop constraint if exists "Table_id_key";
-- alter table "public"."Table" add constraint "Table_id_key" unique (id);

-- 5) (on referencing tables) add new null columns to reference new uuid PKs
-- alter table "public"."OtherTable" add column if not exists table_uuid uuid;

-- 6) (on referencing tables) set value for new uuid columns using the old bigint FK
-- update "public"."OtherTable" ref set table_uuid = curr.id from "public"."Table" curr where ref.table_id is not null and ref.table_id = curr.table_id;

-- 7) add sql from 6) to end of seed.sql, run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 11.5) drop each of these columns in the studio as well so we can generate seed.sql without errors

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

-- 15) Drop old bigint in the studio
-- supabase db dump --local --data-only -f supabase/seed.sql
-- supabase db reset

commit;








-- ===============================================================================
--                                   AccountManagers
-- ===============================================================================

begin;

-- 1) add uuid "id" column (nullable)
-- alter table "public"."Table" add column if not exists id uuid;

-- 2) backfill uuid ids
-- update "public"."Table" set id = gen_random_uuid() where id is null;

-- 3) set "id" not null, with default
-- alter table "public"."Table" alter column id set not null, alter column id set default gen_random_uuid();

-- 4) make id unique so it can be referenced by a FK
-- alter table "public"."Table" drop constraint if exists "Table_id_key";
-- alter table "public"."Table" add constraint "Table_id_key" unique (id);

-- 5) (on referencing tables) add new null columns to reference new uuid PKs
-- alter table "public"."OtherTable" add column if not exists table_uuid uuid;

-- 6) (on referencing tables) set value for new uuid columns using the old bigint FK
-- update "public"."OtherTable" ref set table_uuid = curr.id from "public"."Table" curr where ref.table_id is not null and ref.table_id = curr.table_id;

-- 7) add sql from 6) to end of seed.sql, run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 11.5) drop each of these columns in the studio as well so we can generate seed.sql without errors

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

-- 15) Drop old bigint in the studio
-- supabase db dump --local --data-only -f supabase/seed.sql
-- supabase db reset

commit;








-- ===============================================================================
--                                   AccountManagers
-- ===============================================================================

begin;

-- 1) add uuid "id" column (nullable)
-- alter table "public"."Table" add column if not exists id uuid;

-- 2) backfill uuid ids
-- update "public"."Table" set id = gen_random_uuid() where id is null;

-- 3) set "id" not null, with default
-- alter table "public"."Table" alter column id set not null, alter column id set default gen_random_uuid();

-- 4) make id unique so it can be referenced by a FK
-- alter table "public"."Table" drop constraint if exists "Table_id_key";
-- alter table "public"."Table" add constraint "Table_id_key" unique (id);

-- 5) (on referencing tables) add new null columns to reference new uuid PKs
-- alter table "public"."OtherTable" add column if not exists table_uuid uuid;

-- 6) (on referencing tables) set value for new uuid columns using the old bigint FK
-- update "public"."OtherTable" ref set table_uuid = curr.id from "public"."Table" curr where ref.table_id is not null and ref.table_id = curr.table_id;

-- 7) add sql from 6) to end of seed.sql, run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 11.5) drop each of these columns in the studio as well so we can generate seed.sql without errors

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

-- 15) Drop old bigint in the studio
-- supabase db dump --local --data-only -f supabase/seed.sql
-- supabase db reset

commit;








-- ===============================================================================
--                                   AccountManagers
-- ===============================================================================

begin;

-- 1) add uuid "id" column (nullable)
-- alter table "public"."Table" add column if not exists id uuid;

-- 2) backfill uuid ids
-- update "public"."Table" set id = gen_random_uuid() where id is null;

-- 3) set "id" not null, with default
-- alter table "public"."Table" alter column id set not null, alter column id set default gen_random_uuid();

-- 4) make id unique so it can be referenced by a FK
-- alter table "public"."Table" drop constraint if exists "Table_id_key";
-- alter table "public"."Table" add constraint "Table_id_key" unique (id);

-- 5) (on referencing tables) add new null columns to reference new uuid PKs
-- alter table "public"."OtherTable" add column if not exists table_uuid uuid;

-- 6) (on referencing tables) set value for new uuid columns using the old bigint FK
-- update "public"."OtherTable" ref set table_uuid = curr.id from "public"."Table" curr where ref.table_id is not null and ref.table_id = curr.table_id;

-- 7) add sql from 6) to end of seed.sql, run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 11.5) drop each of these columns in the studio as well so we can generate seed.sql without errors

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

-- 15) Drop old bigint in the studio
-- supabase db dump --local --data-only -f supabase/seed.sql
-- supabase db reset

commit;








-- ===============================================================================
--                                   AccountManagers
-- ===============================================================================

begin;

-- 1) add uuid "id" column (nullable)
-- alter table "public"."Table" add column if not exists id uuid;

-- 2) backfill uuid ids
-- update "public"."Table" set id = gen_random_uuid() where id is null;

-- 3) set "id" not null, with default
-- alter table "public"."Table" alter column id set not null, alter column id set default gen_random_uuid();

-- 4) make id unique so it can be referenced by a FK
-- alter table "public"."Table" drop constraint if exists "Table_id_key";
-- alter table "public"."Table" add constraint "Table_id_key" unique (id);

-- 5) (on referencing tables) add new null columns to reference new uuid PKs
-- alter table "public"."OtherTable" add column if not exists table_uuid uuid;

-- 6) (on referencing tables) set value for new uuid columns using the old bigint FK
-- update "public"."OtherTable" ref set table_uuid = curr.id from "public"."Table" curr where ref.table_id is not null and ref.table_id = curr.table_id;

-- 7) add sql from 6) to end of seed.sql, run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 11.5) drop each of these columns in the studio as well so we can generate seed.sql without errors

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

-- 15) Drop old bigint in the studio
-- supabase db dump --local --data-only -f supabase/seed.sql
-- supabase db reset

commit;








-- ===============================================================================
--                                   AccountManagers
-- ===============================================================================

begin;

-- 1) add uuid "id" column (nullable)
-- alter table "public"."Table" add column if not exists id uuid;

-- 2) backfill uuid ids
-- update "public"."Table" set id = gen_random_uuid() where id is null;

-- 3) set "id" not null, with default
-- alter table "public"."Table" alter column id set not null, alter column id set default gen_random_uuid();

-- 4) make id unique so it can be referenced by a FK
-- alter table "public"."Table" drop constraint if exists "Table_id_key";
-- alter table "public"."Table" add constraint "Table_id_key" unique (id);

-- 5) (on referencing tables) add new null columns to reference new uuid PKs
-- alter table "public"."OtherTable" add column if not exists table_uuid uuid;

-- 6) (on referencing tables) set value for new uuid columns using the old bigint FK
-- update "public"."OtherTable" ref set table_uuid = curr.id from "public"."Table" curr where ref.table_id is not null and ref.table_id = curr.table_id;

-- 7) add sql from 6) to end of seed.sql, run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 11.5) drop each of these columns in the studio as well so we can generate seed.sql without errors

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

-- 15) Drop old bigint in the studio
-- supabase db dump --local --data-only -f supabase/seed.sql
-- supabase db reset

commit;








-- ===============================================================================
--                                   AccountManagers
-- ===============================================================================

begin;

-- 1) add uuid "id" column (nullable)
-- alter table "public"."Table" add column if not exists id uuid;

-- 2) backfill uuid ids
-- update "public"."Table" set id = gen_random_uuid() where id is null;

-- 3) set "id" not null, with default
-- alter table "public"."Table" alter column id set not null, alter column id set default gen_random_uuid();

-- 4) make id unique so it can be referenced by a FK
-- alter table "public"."Table" drop constraint if exists "Table_id_key";
-- alter table "public"."Table" add constraint "Table_id_key" unique (id);

-- 5) (on referencing tables) add new null columns to reference new uuid PKs
-- alter table "public"."OtherTable" add column if not exists table_uuid uuid;

-- 6) (on referencing tables) set value for new uuid columns using the old bigint FK
-- update "public"."OtherTable" ref set table_uuid = curr.id from "public"."Table" curr where ref.table_id is not null and ref.table_id = curr.table_id;

-- 7) add sql from 6) to end of seed.sql, run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 11.5) drop each of these columns in the studio as well so we can generate seed.sql without errors

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

-- 15) Drop old bigint in the studio
-- supabase db dump --local --data-only -f supabase/seed.sql
-- supabase db reset

commit;








-- ===============================================================================
--                                   AccountManagers
-- ===============================================================================

begin;

-- 1) add uuid "id" column (nullable)
-- alter table "public"."Table" add column if not exists id uuid;

-- 2) backfill uuid ids
-- update "public"."Table" set id = gen_random_uuid() where id is null;

-- 3) set "id" not null, with default
-- alter table "public"."Table" alter column id set not null, alter column id set default gen_random_uuid();

-- 4) make id unique so it can be referenced by a FK
-- alter table "public"."Table" drop constraint if exists "Table_id_key";
-- alter table "public"."Table" add constraint "Table_id_key" unique (id);

-- 5) (on referencing tables) add new null columns to reference new uuid PKs
-- alter table "public"."OtherTable" add column if not exists table_uuid uuid;

-- 6) (on referencing tables) set value for new uuid columns using the old bigint FK
-- update "public"."OtherTable" ref set table_uuid = curr.id from "public"."Table" curr where ref.table_id is not null and ref.table_id = curr.table_id;

-- 7) add sql from 6) to end of seed.sql, run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 11.5) drop each of these columns in the studio as well so we can generate seed.sql without errors

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

-- 15) Drop old bigint in the studio
-- supabase db dump --local --data-only -f supabase/seed.sql
-- supabase db reset

commit;








-- ===============================================================================
--                                   AccountManagers
-- ===============================================================================

begin;

-- 1) add uuid "id" column (nullable)
-- alter table "public"."Table" add column if not exists id uuid;

-- 2) backfill uuid ids
-- update "public"."Table" set id = gen_random_uuid() where id is null;

-- 3) set "id" not null, with default
-- alter table "public"."Table" alter column id set not null, alter column id set default gen_random_uuid();

-- 4) make id unique so it can be referenced by a FK
-- alter table "public"."Table" drop constraint if exists "Table_id_key";
-- alter table "public"."Table" add constraint "Table_id_key" unique (id);

-- 5) (on referencing tables) add new null columns to reference new uuid PKs
-- alter table "public"."OtherTable" add column if not exists table_uuid uuid;

-- 6) (on referencing tables) set value for new uuid columns using the old bigint FK
-- update "public"."OtherTable" ref set table_uuid = curr.id from "public"."Table" curr where ref.table_id is not null and ref.table_id = curr.table_id;

-- 7) add sql from 6) to end of seed.sql, run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 11.5) drop each of these columns in the studio as well so we can generate seed.sql without errors

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

-- 15) Drop old bigint in the studio
-- supabase db dump --local --data-only -f supabase/seed.sql
-- supabase db reset

commit;








-- ===============================================================================
--                                   AccountManagers
-- ===============================================================================

begin;

-- 1) add uuid "id" column (nullable)
-- alter table "public"."Table" add column if not exists id uuid;

-- 2) backfill uuid ids
-- update "public"."Table" set id = gen_random_uuid() where id is null;

-- 3) set "id" not null, with default
-- alter table "public"."Table" alter column id set not null, alter column id set default gen_random_uuid();

-- 4) make id unique so it can be referenced by a FK
-- alter table "public"."Table" drop constraint if exists "Table_id_key";
-- alter table "public"."Table" add constraint "Table_id_key" unique (id);

-- 5) (on referencing tables) add new null columns to reference new uuid PKs
-- alter table "public"."OtherTable" add column if not exists table_uuid uuid;

-- 6) (on referencing tables) set value for new uuid columns using the old bigint FK
-- update "public"."OtherTable" ref set table_uuid = curr.id from "public"."Table" curr where ref.table_id is not null and ref.table_id = curr.table_id;

-- 7) add sql from 6) to end of seed.sql, run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 11.5) drop each of these columns in the studio as well so we can generate seed.sql without errors

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

-- 15) Drop old bigint in the studio
-- supabase db dump --local --data-only -f supabase/seed.sql
-- supabase db reset

commit;








-- ===============================================================================
--                                   AccountManagers
-- ===============================================================================

begin;

-- 1) add uuid "id" column (nullable)
-- alter table "public"."Table" add column if not exists id uuid;

-- 2) backfill uuid ids
-- update "public"."Table" set id = gen_random_uuid() where id is null;

-- 3) set "id" not null, with default
-- alter table "public"."Table" alter column id set not null, alter column id set default gen_random_uuid();

-- 4) make id unique so it can be referenced by a FK
-- alter table "public"."Table" drop constraint if exists "Table_id_key";
-- alter table "public"."Table" add constraint "Table_id_key" unique (id);

-- 5) (on referencing tables) add new null columns to reference new uuid PKs
-- alter table "public"."OtherTable" add column if not exists table_uuid uuid;

-- 6) (on referencing tables) set value for new uuid columns using the old bigint FK
-- update "public"."OtherTable" ref set table_uuid = curr.id from "public"."Table" curr where ref.table_id is not null and ref.table_id = curr.table_id;

-- 7) add sql from 6) to end of seed.sql, run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 11.5) drop each of these columns in the studio as well so we can generate seed.sql without errors

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

-- 15) Drop old bigint in the studio
-- supabase db dump --local --data-only -f supabase/seed.sql
-- supabase db reset

commit;








