drop policy "Allow All for Auth" on "public"."addresses";

drop policy "Allow All for Auth" on "public"."bleacherevents";

drop policy "Allow All for Auth" on "public"."bleachers";

drop policy "Allow All for Auth" on "public"."events";

drop policy "Allow All for Auth" on "public"."homebases";

drop policy "Allow All for Auth" on "public"."userhomebases";

drop policy "Allow All for Auth" on "public"."userroles";

drop policy "Allow All for Auth" on "public"."users";

drop policy "Allow All for Auth" on "public"."userstatuses";

revoke delete on table "public"."addresses" from "anon";

revoke insert on table "public"."addresses" from "anon";

revoke references on table "public"."addresses" from "anon";

revoke select on table "public"."addresses" from "anon";

revoke trigger on table "public"."addresses" from "anon";

revoke truncate on table "public"."addresses" from "anon";

revoke update on table "public"."addresses" from "anon";

revoke delete on table "public"."addresses" from "authenticated";

revoke insert on table "public"."addresses" from "authenticated";

revoke references on table "public"."addresses" from "authenticated";

revoke select on table "public"."addresses" from "authenticated";

revoke trigger on table "public"."addresses" from "authenticated";

revoke truncate on table "public"."addresses" from "authenticated";

revoke update on table "public"."addresses" from "authenticated";

revoke delete on table "public"."addresses" from "service_role";

revoke insert on table "public"."addresses" from "service_role";

revoke references on table "public"."addresses" from "service_role";

revoke select on table "public"."addresses" from "service_role";

revoke trigger on table "public"."addresses" from "service_role";

revoke truncate on table "public"."addresses" from "service_role";

revoke update on table "public"."addresses" from "service_role";

revoke delete on table "public"."bleacherevents" from "anon";

revoke insert on table "public"."bleacherevents" from "anon";

revoke references on table "public"."bleacherevents" from "anon";

revoke select on table "public"."bleacherevents" from "anon";

revoke trigger on table "public"."bleacherevents" from "anon";

revoke truncate on table "public"."bleacherevents" from "anon";

revoke update on table "public"."bleacherevents" from "anon";

revoke delete on table "public"."bleacherevents" from "authenticated";

revoke insert on table "public"."bleacherevents" from "authenticated";

revoke references on table "public"."bleacherevents" from "authenticated";

revoke select on table "public"."bleacherevents" from "authenticated";

revoke trigger on table "public"."bleacherevents" from "authenticated";

revoke truncate on table "public"."bleacherevents" from "authenticated";

revoke update on table "public"."bleacherevents" from "authenticated";

revoke delete on table "public"."bleacherevents" from "service_role";

revoke insert on table "public"."bleacherevents" from "service_role";

revoke references on table "public"."bleacherevents" from "service_role";

revoke select on table "public"."bleacherevents" from "service_role";

revoke trigger on table "public"."bleacherevents" from "service_role";

revoke truncate on table "public"."bleacherevents" from "service_role";

revoke update on table "public"."bleacherevents" from "service_role";

revoke delete on table "public"."bleachers" from "anon";

revoke insert on table "public"."bleachers" from "anon";

revoke references on table "public"."bleachers" from "anon";

revoke select on table "public"."bleachers" from "anon";

revoke trigger on table "public"."bleachers" from "anon";

revoke truncate on table "public"."bleachers" from "anon";

revoke update on table "public"."bleachers" from "anon";

revoke delete on table "public"."bleachers" from "authenticated";

revoke insert on table "public"."bleachers" from "authenticated";

revoke references on table "public"."bleachers" from "authenticated";

revoke select on table "public"."bleachers" from "authenticated";

revoke trigger on table "public"."bleachers" from "authenticated";

revoke truncate on table "public"."bleachers" from "authenticated";

revoke update on table "public"."bleachers" from "authenticated";

revoke delete on table "public"."bleachers" from "service_role";

revoke insert on table "public"."bleachers" from "service_role";

revoke references on table "public"."bleachers" from "service_role";

revoke select on table "public"."bleachers" from "service_role";

revoke trigger on table "public"."bleachers" from "service_role";

revoke truncate on table "public"."bleachers" from "service_role";

revoke update on table "public"."bleachers" from "service_role";

revoke delete on table "public"."events" from "anon";

revoke insert on table "public"."events" from "anon";

revoke references on table "public"."events" from "anon";

revoke select on table "public"."events" from "anon";

revoke trigger on table "public"."events" from "anon";

revoke truncate on table "public"."events" from "anon";

revoke update on table "public"."events" from "anon";

revoke delete on table "public"."events" from "authenticated";

revoke insert on table "public"."events" from "authenticated";

revoke references on table "public"."events" from "authenticated";

revoke select on table "public"."events" from "authenticated";

revoke trigger on table "public"."events" from "authenticated";

revoke truncate on table "public"."events" from "authenticated";

revoke update on table "public"."events" from "authenticated";

revoke delete on table "public"."events" from "service_role";

revoke insert on table "public"."events" from "service_role";

revoke references on table "public"."events" from "service_role";

revoke select on table "public"."events" from "service_role";

revoke trigger on table "public"."events" from "service_role";

revoke truncate on table "public"."events" from "service_role";

revoke update on table "public"."events" from "service_role";

revoke delete on table "public"."homebases" from "anon";

revoke insert on table "public"."homebases" from "anon";

revoke references on table "public"."homebases" from "anon";

revoke select on table "public"."homebases" from "anon";

revoke trigger on table "public"."homebases" from "anon";

revoke truncate on table "public"."homebases" from "anon";

revoke update on table "public"."homebases" from "anon";

revoke delete on table "public"."homebases" from "authenticated";

revoke insert on table "public"."homebases" from "authenticated";

revoke references on table "public"."homebases" from "authenticated";

revoke select on table "public"."homebases" from "authenticated";

revoke trigger on table "public"."homebases" from "authenticated";

revoke truncate on table "public"."homebases" from "authenticated";

revoke update on table "public"."homebases" from "authenticated";

revoke delete on table "public"."homebases" from "service_role";

revoke insert on table "public"."homebases" from "service_role";

revoke references on table "public"."homebases" from "service_role";

revoke select on table "public"."homebases" from "service_role";

revoke trigger on table "public"."homebases" from "service_role";

revoke truncate on table "public"."homebases" from "service_role";

revoke update on table "public"."homebases" from "service_role";

revoke delete on table "public"."userhomebases" from "anon";

revoke insert on table "public"."userhomebases" from "anon";

revoke references on table "public"."userhomebases" from "anon";

revoke select on table "public"."userhomebases" from "anon";

revoke trigger on table "public"."userhomebases" from "anon";

revoke truncate on table "public"."userhomebases" from "anon";

revoke update on table "public"."userhomebases" from "anon";

revoke delete on table "public"."userhomebases" from "authenticated";

revoke insert on table "public"."userhomebases" from "authenticated";

revoke references on table "public"."userhomebases" from "authenticated";

revoke select on table "public"."userhomebases" from "authenticated";

revoke trigger on table "public"."userhomebases" from "authenticated";

revoke truncate on table "public"."userhomebases" from "authenticated";

revoke update on table "public"."userhomebases" from "authenticated";

revoke delete on table "public"."userhomebases" from "service_role";

revoke insert on table "public"."userhomebases" from "service_role";

revoke references on table "public"."userhomebases" from "service_role";

revoke select on table "public"."userhomebases" from "service_role";

revoke trigger on table "public"."userhomebases" from "service_role";

revoke truncate on table "public"."userhomebases" from "service_role";

revoke update on table "public"."userhomebases" from "service_role";

revoke delete on table "public"."userroles" from "anon";

revoke insert on table "public"."userroles" from "anon";

revoke references on table "public"."userroles" from "anon";

revoke select on table "public"."userroles" from "anon";

revoke trigger on table "public"."userroles" from "anon";

revoke truncate on table "public"."userroles" from "anon";

revoke update on table "public"."userroles" from "anon";

revoke delete on table "public"."userroles" from "authenticated";

revoke insert on table "public"."userroles" from "authenticated";

revoke references on table "public"."userroles" from "authenticated";

revoke select on table "public"."userroles" from "authenticated";

revoke trigger on table "public"."userroles" from "authenticated";

revoke truncate on table "public"."userroles" from "authenticated";

revoke update on table "public"."userroles" from "authenticated";

revoke delete on table "public"."userroles" from "service_role";

revoke insert on table "public"."userroles" from "service_role";

revoke references on table "public"."userroles" from "service_role";

revoke select on table "public"."userroles" from "service_role";

revoke trigger on table "public"."userroles" from "service_role";

revoke truncate on table "public"."userroles" from "service_role";

revoke update on table "public"."userroles" from "service_role";

revoke delete on table "public"."users" from "anon";

revoke insert on table "public"."users" from "anon";

revoke references on table "public"."users" from "anon";

revoke select on table "public"."users" from "anon";

revoke trigger on table "public"."users" from "anon";

revoke truncate on table "public"."users" from "anon";

revoke update on table "public"."users" from "anon";

revoke delete on table "public"."users" from "authenticated";

revoke insert on table "public"."users" from "authenticated";

revoke references on table "public"."users" from "authenticated";

revoke select on table "public"."users" from "authenticated";

revoke trigger on table "public"."users" from "authenticated";

revoke truncate on table "public"."users" from "authenticated";

revoke update on table "public"."users" from "authenticated";

revoke delete on table "public"."users" from "service_role";

revoke insert on table "public"."users" from "service_role";

revoke references on table "public"."users" from "service_role";

revoke select on table "public"."users" from "service_role";

revoke trigger on table "public"."users" from "service_role";

revoke truncate on table "public"."users" from "service_role";

revoke update on table "public"."users" from "service_role";

revoke delete on table "public"."userstatuses" from "anon";

revoke insert on table "public"."userstatuses" from "anon";

revoke references on table "public"."userstatuses" from "anon";

revoke select on table "public"."userstatuses" from "anon";

revoke trigger on table "public"."userstatuses" from "anon";

revoke truncate on table "public"."userstatuses" from "anon";

revoke update on table "public"."userstatuses" from "anon";

revoke delete on table "public"."userstatuses" from "authenticated";

revoke insert on table "public"."userstatuses" from "authenticated";

revoke references on table "public"."userstatuses" from "authenticated";

revoke select on table "public"."userstatuses" from "authenticated";

revoke trigger on table "public"."userstatuses" from "authenticated";

revoke truncate on table "public"."userstatuses" from "authenticated";

revoke update on table "public"."userstatuses" from "authenticated";

revoke delete on table "public"."userstatuses" from "service_role";

revoke insert on table "public"."userstatuses" from "service_role";

revoke references on table "public"."userstatuses" from "service_role";

revoke select on table "public"."userstatuses" from "service_role";

revoke trigger on table "public"."userstatuses" from "service_role";

revoke truncate on table "public"."userstatuses" from "service_role";

revoke update on table "public"."userstatuses" from "service_role";

alter table "public"."bleacherevents" drop constraint "bleacherevents_bleacher_id_fkey";

alter table "public"."bleacherevents" drop constraint "bleacherevents_event_id_fkey";

alter table "public"."bleachers" drop constraint "bleachers_bleacher_number_key";

alter table "public"."bleachers" drop constraint "bleachers_home_base_id_fkey";

alter table "public"."bleachers" drop constraint "bleachers_winter_home_base_id_fkey";

alter table "public"."events" drop constraint "events_address_id_fkey";

alter table "public"."userhomebases" drop constraint "userhomebases_home_base_id_fkey";

alter table "public"."userhomebases" drop constraint "userhomebases_user_id_fkey";

alter table "public"."users" drop constraint "users_clerk_user_id_key";

alter table "public"."users" drop constraint "users_email_key";

alter table "public"."addresses" drop constraint "addresses_pkey";

alter table "public"."bleacherevents" drop constraint "bleacherevents_pkey";

alter table "public"."bleachers" drop constraint "bleachers_pkey";

alter table "public"."events" drop constraint "events_pkey";

alter table "public"."homebases" drop constraint "homebases_pkey";

alter table "public"."userhomebases" drop constraint "userhomebases_pkey";

alter table "public"."userroles" drop constraint "userroles_pkey";

alter table "public"."users" drop constraint "users_pkey";

alter table "public"."userstatuses" drop constraint "userstatuses_pkey";

drop index if exists "public"."addresses_pkey";

drop index if exists "public"."bleacherevents_pkey";

drop index if exists "public"."bleachers_bleacher_number_key";

drop index if exists "public"."bleachers_pkey";

drop index if exists "public"."events_pkey";

drop index if exists "public"."homebases_pkey";

drop index if exists "public"."userhomebases_pkey";

drop index if exists "public"."userroles_pkey";

drop index if exists "public"."users_clerk_user_id_key";

drop index if exists "public"."users_email_key";

drop index if exists "public"."users_pkey";

drop index if exists "public"."userstatuses_pkey";

drop table "public"."addresses";

drop table "public"."bleacherevents";

drop table "public"."bleachers";

drop table "public"."events";

drop table "public"."homebases";

drop table "public"."userhomebases";

drop table "public"."userroles";

drop table "public"."users";

drop table "public"."userstatuses";

create table "public"."Addresses" (
    "address_id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "street" text not null,
    "city" text not null,
    "state_province" text not null,
    "zip_postal" text
);


create table "public"."BleacherEvents" (
    "bleacher_event_id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "bleacher_id" bigint not null,
    "event_id" bigint not null
);


create table "public"."Bleachers" (
    "bleacher_id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default (now() AT TIME ZONE 'utc'::text),
    "bleacher_number" smallint not null,
    "home_base_id" bigint not null,
    "winter_home_base_id" bigint not null,
    "bleacher_rows" smallint not null,
    "bleacher_seats" smallint not null,
    "created_by" uuid,
    "updated_at" timestamp without time zone,
    "updated_by" uuid
);


create table "public"."Events" (
    "event_id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "event_name" text not null,
    "setup_start" date,
    "event_start" date not null,
    "event_end" date not null,
    "teardown_end" date,
    "address_id" bigint not null,
    "total_seats" integer,
    "seven_row" smallint,
    "ten_row" smallint,
    "fifteen_row" smallint,
    "lenient" boolean not null,
    "booked" boolean not null default false,
    "notes" text,
    "must_be_clean" boolean not null default false,
    "hsl_hue" smallint
);


create table "public"."HomeBases" (
    "home_base_id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "home_base_name" text not null
);


alter table "public"."HomeBases" enable row level security;

create table "public"."UserHomeBases" (
    "user_home_base_id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "user_id" bigint,
    "home_base_id" bigint
);


create table "public"."UserRoles" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "role" text not null
);


create table "public"."UserStatuses" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "status" text not null
);


create table "public"."Users" (
    "user_id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "first_name" text,
    "last_name" text,
    "email" text not null,
    "phone" text,
    "clerk_user_id" text,
    "status" bigint not null default '1'::bigint,
    "role" bigint default '1'::bigint
);


CREATE UNIQUE INDEX addresses_pkey ON public."Addresses" USING btree (address_id);

CREATE UNIQUE INDEX bleacherevents_pkey ON public."BleacherEvents" USING btree (bleacher_event_id);

CREATE UNIQUE INDEX bleachers_bleacher_number_key ON public."Bleachers" USING btree (bleacher_number);

CREATE UNIQUE INDEX bleachers_pkey ON public."Bleachers" USING btree (bleacher_id);

CREATE UNIQUE INDEX events_pkey ON public."Events" USING btree (event_id);

CREATE UNIQUE INDEX homebases_pkey ON public."HomeBases" USING btree (home_base_id);

CREATE UNIQUE INDEX userhomebases_pkey ON public."UserHomeBases" USING btree (user_home_base_id);

CREATE UNIQUE INDEX userroles_pkey ON public."UserRoles" USING btree (id);

CREATE UNIQUE INDEX users_clerk_user_id_key ON public."Users" USING btree (clerk_user_id);

CREATE UNIQUE INDEX users_email_key ON public."Users" USING btree (email);

CREATE UNIQUE INDEX users_pkey ON public."Users" USING btree (user_id);

CREATE UNIQUE INDEX userstatuses_pkey ON public."UserStatuses" USING btree (id);

alter table "public"."Addresses" add constraint "addresses_pkey" PRIMARY KEY using index "addresses_pkey";

alter table "public"."BleacherEvents" add constraint "bleacherevents_pkey" PRIMARY KEY using index "bleacherevents_pkey";

alter table "public"."Bleachers" add constraint "bleachers_pkey" PRIMARY KEY using index "bleachers_pkey";

alter table "public"."Events" add constraint "events_pkey" PRIMARY KEY using index "events_pkey";

alter table "public"."HomeBases" add constraint "homebases_pkey" PRIMARY KEY using index "homebases_pkey";

alter table "public"."UserHomeBases" add constraint "userhomebases_pkey" PRIMARY KEY using index "userhomebases_pkey";

alter table "public"."UserRoles" add constraint "userroles_pkey" PRIMARY KEY using index "userroles_pkey";

alter table "public"."UserStatuses" add constraint "userstatuses_pkey" PRIMARY KEY using index "userstatuses_pkey";

alter table "public"."Users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."BleacherEvents" add constraint "bleacherevents_bleacher_id_fkey" FOREIGN KEY (bleacher_id) REFERENCES "Bleachers"(bleacher_id) ON UPDATE CASCADE ON DELETE RESTRICT not valid;

alter table "public"."BleacherEvents" validate constraint "bleacherevents_bleacher_id_fkey";

alter table "public"."BleacherEvents" add constraint "bleacherevents_event_id_fkey" FOREIGN KEY (event_id) REFERENCES "Events"(event_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."BleacherEvents" validate constraint "bleacherevents_event_id_fkey";

alter table "public"."Bleachers" add constraint "bleachers_bleacher_number_key" UNIQUE using index "bleachers_bleacher_number_key";

alter table "public"."Bleachers" add constraint "bleachers_home_base_id_fkey" FOREIGN KEY (home_base_id) REFERENCES "HomeBases"(home_base_id) ON UPDATE CASCADE not valid;

alter table "public"."Bleachers" validate constraint "bleachers_home_base_id_fkey";

alter table "public"."Bleachers" add constraint "bleachers_winter_home_base_id_fkey" FOREIGN KEY (winter_home_base_id) REFERENCES "HomeBases"(home_base_id) ON UPDATE CASCADE not valid;

alter table "public"."Bleachers" validate constraint "bleachers_winter_home_base_id_fkey";

alter table "public"."Events" add constraint "events_address_id_fkey" FOREIGN KEY (address_id) REFERENCES "Addresses"(address_id) ON UPDATE CASCADE ON DELETE RESTRICT not valid;

alter table "public"."Events" validate constraint "events_address_id_fkey";

alter table "public"."UserHomeBases" add constraint "userhomebases_home_base_id_fkey" FOREIGN KEY (home_base_id) REFERENCES "HomeBases"(home_base_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."UserHomeBases" validate constraint "userhomebases_home_base_id_fkey";

alter table "public"."UserHomeBases" add constraint "userhomebases_user_id_fkey" FOREIGN KEY (user_id) REFERENCES "Users"(user_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."UserHomeBases" validate constraint "userhomebases_user_id_fkey";

alter table "public"."Users" add constraint "users_clerk_user_id_key" UNIQUE using index "users_clerk_user_id_key";

alter table "public"."Users" add constraint "users_email_key" UNIQUE using index "users_email_key";

grant delete on table "public"."Addresses" to "anon";

grant insert on table "public"."Addresses" to "anon";

grant references on table "public"."Addresses" to "anon";

grant select on table "public"."Addresses" to "anon";

grant trigger on table "public"."Addresses" to "anon";

grant truncate on table "public"."Addresses" to "anon";

grant update on table "public"."Addresses" to "anon";

grant delete on table "public"."Addresses" to "authenticated";

grant insert on table "public"."Addresses" to "authenticated";

grant references on table "public"."Addresses" to "authenticated";

grant select on table "public"."Addresses" to "authenticated";

grant trigger on table "public"."Addresses" to "authenticated";

grant truncate on table "public"."Addresses" to "authenticated";

grant update on table "public"."Addresses" to "authenticated";

grant delete on table "public"."Addresses" to "service_role";

grant insert on table "public"."Addresses" to "service_role";

grant references on table "public"."Addresses" to "service_role";

grant select on table "public"."Addresses" to "service_role";

grant trigger on table "public"."Addresses" to "service_role";

grant truncate on table "public"."Addresses" to "service_role";

grant update on table "public"."Addresses" to "service_role";

grant delete on table "public"."BleacherEvents" to "anon";

grant insert on table "public"."BleacherEvents" to "anon";

grant references on table "public"."BleacherEvents" to "anon";

grant select on table "public"."BleacherEvents" to "anon";

grant trigger on table "public"."BleacherEvents" to "anon";

grant truncate on table "public"."BleacherEvents" to "anon";

grant update on table "public"."BleacherEvents" to "anon";

grant delete on table "public"."BleacherEvents" to "authenticated";

grant insert on table "public"."BleacherEvents" to "authenticated";

grant references on table "public"."BleacherEvents" to "authenticated";

grant select on table "public"."BleacherEvents" to "authenticated";

grant trigger on table "public"."BleacherEvents" to "authenticated";

grant truncate on table "public"."BleacherEvents" to "authenticated";

grant update on table "public"."BleacherEvents" to "authenticated";

grant delete on table "public"."BleacherEvents" to "service_role";

grant insert on table "public"."BleacherEvents" to "service_role";

grant references on table "public"."BleacherEvents" to "service_role";

grant select on table "public"."BleacherEvents" to "service_role";

grant trigger on table "public"."BleacherEvents" to "service_role";

grant truncate on table "public"."BleacherEvents" to "service_role";

grant update on table "public"."BleacherEvents" to "service_role";

grant delete on table "public"."Bleachers" to "anon";

grant insert on table "public"."Bleachers" to "anon";

grant references on table "public"."Bleachers" to "anon";

grant select on table "public"."Bleachers" to "anon";

grant trigger on table "public"."Bleachers" to "anon";

grant truncate on table "public"."Bleachers" to "anon";

grant update on table "public"."Bleachers" to "anon";

grant delete on table "public"."Bleachers" to "authenticated";

grant insert on table "public"."Bleachers" to "authenticated";

grant references on table "public"."Bleachers" to "authenticated";

grant select on table "public"."Bleachers" to "authenticated";

grant trigger on table "public"."Bleachers" to "authenticated";

grant truncate on table "public"."Bleachers" to "authenticated";

grant update on table "public"."Bleachers" to "authenticated";

grant delete on table "public"."Bleachers" to "service_role";

grant insert on table "public"."Bleachers" to "service_role";

grant references on table "public"."Bleachers" to "service_role";

grant select on table "public"."Bleachers" to "service_role";

grant trigger on table "public"."Bleachers" to "service_role";

grant truncate on table "public"."Bleachers" to "service_role";

grant update on table "public"."Bleachers" to "service_role";

grant delete on table "public"."Events" to "anon";

grant insert on table "public"."Events" to "anon";

grant references on table "public"."Events" to "anon";

grant select on table "public"."Events" to "anon";

grant trigger on table "public"."Events" to "anon";

grant truncate on table "public"."Events" to "anon";

grant update on table "public"."Events" to "anon";

grant delete on table "public"."Events" to "authenticated";

grant insert on table "public"."Events" to "authenticated";

grant references on table "public"."Events" to "authenticated";

grant select on table "public"."Events" to "authenticated";

grant trigger on table "public"."Events" to "authenticated";

grant truncate on table "public"."Events" to "authenticated";

grant update on table "public"."Events" to "authenticated";

grant delete on table "public"."Events" to "service_role";

grant insert on table "public"."Events" to "service_role";

grant references on table "public"."Events" to "service_role";

grant select on table "public"."Events" to "service_role";

grant trigger on table "public"."Events" to "service_role";

grant truncate on table "public"."Events" to "service_role";

grant update on table "public"."Events" to "service_role";

grant delete on table "public"."HomeBases" to "anon";

grant insert on table "public"."HomeBases" to "anon";

grant references on table "public"."HomeBases" to "anon";

grant select on table "public"."HomeBases" to "anon";

grant trigger on table "public"."HomeBases" to "anon";

grant truncate on table "public"."HomeBases" to "anon";

grant update on table "public"."HomeBases" to "anon";

grant delete on table "public"."HomeBases" to "authenticated";

grant insert on table "public"."HomeBases" to "authenticated";

grant references on table "public"."HomeBases" to "authenticated";

grant select on table "public"."HomeBases" to "authenticated";

grant trigger on table "public"."HomeBases" to "authenticated";

grant truncate on table "public"."HomeBases" to "authenticated";

grant update on table "public"."HomeBases" to "authenticated";

grant delete on table "public"."HomeBases" to "service_role";

grant insert on table "public"."HomeBases" to "service_role";

grant references on table "public"."HomeBases" to "service_role";

grant select on table "public"."HomeBases" to "service_role";

grant trigger on table "public"."HomeBases" to "service_role";

grant truncate on table "public"."HomeBases" to "service_role";

grant update on table "public"."HomeBases" to "service_role";

grant delete on table "public"."UserHomeBases" to "anon";

grant insert on table "public"."UserHomeBases" to "anon";

grant references on table "public"."UserHomeBases" to "anon";

grant select on table "public"."UserHomeBases" to "anon";

grant trigger on table "public"."UserHomeBases" to "anon";

grant truncate on table "public"."UserHomeBases" to "anon";

grant update on table "public"."UserHomeBases" to "anon";

grant delete on table "public"."UserHomeBases" to "authenticated";

grant insert on table "public"."UserHomeBases" to "authenticated";

grant references on table "public"."UserHomeBases" to "authenticated";

grant select on table "public"."UserHomeBases" to "authenticated";

grant trigger on table "public"."UserHomeBases" to "authenticated";

grant truncate on table "public"."UserHomeBases" to "authenticated";

grant update on table "public"."UserHomeBases" to "authenticated";

grant delete on table "public"."UserHomeBases" to "service_role";

grant insert on table "public"."UserHomeBases" to "service_role";

grant references on table "public"."UserHomeBases" to "service_role";

grant select on table "public"."UserHomeBases" to "service_role";

grant trigger on table "public"."UserHomeBases" to "service_role";

grant truncate on table "public"."UserHomeBases" to "service_role";

grant update on table "public"."UserHomeBases" to "service_role";

grant delete on table "public"."UserRoles" to "anon";

grant insert on table "public"."UserRoles" to "anon";

grant references on table "public"."UserRoles" to "anon";

grant select on table "public"."UserRoles" to "anon";

grant trigger on table "public"."UserRoles" to "anon";

grant truncate on table "public"."UserRoles" to "anon";

grant update on table "public"."UserRoles" to "anon";

grant delete on table "public"."UserRoles" to "authenticated";

grant insert on table "public"."UserRoles" to "authenticated";

grant references on table "public"."UserRoles" to "authenticated";

grant select on table "public"."UserRoles" to "authenticated";

grant trigger on table "public"."UserRoles" to "authenticated";

grant truncate on table "public"."UserRoles" to "authenticated";

grant update on table "public"."UserRoles" to "authenticated";

grant delete on table "public"."UserRoles" to "service_role";

grant insert on table "public"."UserRoles" to "service_role";

grant references on table "public"."UserRoles" to "service_role";

grant select on table "public"."UserRoles" to "service_role";

grant trigger on table "public"."UserRoles" to "service_role";

grant truncate on table "public"."UserRoles" to "service_role";

grant update on table "public"."UserRoles" to "service_role";

grant delete on table "public"."UserStatuses" to "anon";

grant insert on table "public"."UserStatuses" to "anon";

grant references on table "public"."UserStatuses" to "anon";

grant select on table "public"."UserStatuses" to "anon";

grant trigger on table "public"."UserStatuses" to "anon";

grant truncate on table "public"."UserStatuses" to "anon";

grant update on table "public"."UserStatuses" to "anon";

grant delete on table "public"."UserStatuses" to "authenticated";

grant insert on table "public"."UserStatuses" to "authenticated";

grant references on table "public"."UserStatuses" to "authenticated";

grant select on table "public"."UserStatuses" to "authenticated";

grant trigger on table "public"."UserStatuses" to "authenticated";

grant truncate on table "public"."UserStatuses" to "authenticated";

grant update on table "public"."UserStatuses" to "authenticated";

grant delete on table "public"."UserStatuses" to "service_role";

grant insert on table "public"."UserStatuses" to "service_role";

grant references on table "public"."UserStatuses" to "service_role";

grant select on table "public"."UserStatuses" to "service_role";

grant trigger on table "public"."UserStatuses" to "service_role";

grant truncate on table "public"."UserStatuses" to "service_role";

grant update on table "public"."UserStatuses" to "service_role";

grant delete on table "public"."Users" to "anon";

grant insert on table "public"."Users" to "anon";

grant references on table "public"."Users" to "anon";

grant select on table "public"."Users" to "anon";

grant trigger on table "public"."Users" to "anon";

grant truncate on table "public"."Users" to "anon";

grant update on table "public"."Users" to "anon";

grant delete on table "public"."Users" to "authenticated";

grant insert on table "public"."Users" to "authenticated";

grant references on table "public"."Users" to "authenticated";

grant select on table "public"."Users" to "authenticated";

grant trigger on table "public"."Users" to "authenticated";

grant truncate on table "public"."Users" to "authenticated";

grant update on table "public"."Users" to "authenticated";

grant delete on table "public"."Users" to "service_role";

grant insert on table "public"."Users" to "service_role";

grant references on table "public"."Users" to "service_role";

grant select on table "public"."Users" to "service_role";

grant trigger on table "public"."Users" to "service_role";

grant truncate on table "public"."Users" to "service_role";

grant update on table "public"."Users" to "service_role";


