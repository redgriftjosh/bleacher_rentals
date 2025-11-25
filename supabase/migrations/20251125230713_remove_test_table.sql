drop policy "Allow All for Auth" on "public"."TestTable";

revoke delete on table "public"."TestTable" from "anon";

revoke insert on table "public"."TestTable" from "anon";

revoke references on table "public"."TestTable" from "anon";

revoke select on table "public"."TestTable" from "anon";

revoke trigger on table "public"."TestTable" from "anon";

revoke truncate on table "public"."TestTable" from "anon";

revoke update on table "public"."TestTable" from "anon";

revoke delete on table "public"."TestTable" from "authenticated";

revoke insert on table "public"."TestTable" from "authenticated";

revoke references on table "public"."TestTable" from "authenticated";

revoke select on table "public"."TestTable" from "authenticated";

revoke trigger on table "public"."TestTable" from "authenticated";

revoke truncate on table "public"."TestTable" from "authenticated";

revoke update on table "public"."TestTable" from "authenticated";

revoke delete on table "public"."TestTable" from "service_role";

revoke insert on table "public"."TestTable" from "service_role";

revoke references on table "public"."TestTable" from "service_role";

revoke select on table "public"."TestTable" from "service_role";

revoke trigger on table "public"."TestTable" from "service_role";

revoke truncate on table "public"."TestTable" from "service_role";

revoke update on table "public"."TestTable" from "service_role";

alter table "public"."TestTable" drop constraint "TestTable_pkey";

drop index if exists "public"."TestTable_pkey";

drop table "public"."TestTable";


