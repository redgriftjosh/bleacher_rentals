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

-- 7) run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

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

-- 7) run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

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

-- 7) run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

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

-- 7) run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

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

-- 7) run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

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

-- 7) run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

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

-- 7) run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

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

-- 7) run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

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

-- 7) run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

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

-- 7) run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

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

-- 7) run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

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

-- 7) run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

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

-- 7) run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

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

-- 7) run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

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

-- 7) run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

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

-- 7) run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

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

-- 7) run supabase db reset, then supabase db dump --local --data-only -f supabase/seed.sql

-- 8) (on referencing tables) drop old FKs constraints
-- alter table "public"."OtherTable" drop constraint if exists "OtherTable_table_id_fkey";

-- 9) (on referencing tables) create new FK constraints with uuids
-- alter table "public"."OtherTable" add constraint "OtherTable_table_uuid_fkey" foreign key (table_uuid) references public."Table"(id);

-- 10) (on referencing tables) create indexes on new uuids
-- create index if not exists "OtherTable_table_uuid_idx" on public."OtherTable"(table_uuid);

-- 11) (on referencing tables) drop old bigint columns
-- alter table "public"."OtherTable" drop column table_id;

-- 12) Drop old PK constraint, rename old column, recreate PK on uuid id
-- alter table "public"."Table" drop constraint if exists "Table_pkey";

-- 13) make new uuid column the primary key
-- alter table "public"."Table" add constraint "Table_pkey" primary key (id);

-- 14) drop old bigint column
-- alter table "public"."Table" drop column table_id;

commit;








