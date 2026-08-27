-- ============================================================================
-- Driver Satisfaction Score — RLS and guard-trigger tests
--
-- The trigger was originally exercised as the postgres superuser, which
-- BYPASSES row level security: the policies were, in effect, untested. Every
-- assertion here runs as `authenticated` with a real `request.jwt.claims`, so
-- `get_current_driver_id()` and `get_user_roles()` resolve exactly as they do
-- for a phone or a browser.
--
-- Two groups of assertions matter most.
--
-- ISOLATION. The survey is deliberately NOT anonymous, so a driver seeing
-- another driver's score and their written complaint is the one disclosure this
-- feature must not make. A driver may read and file only their own answers, and
-- may not amend a submitted one; the four office roles read everything, and
-- only an admin may correct a row.
--
-- LATE OFFLINE WRITES. The section marked LATE is the opposite kind of test: it
-- asserts that the server does NOT reject things. PowerSync classifies an RLS
-- refusal (42501) and a constraint violation (23xxx) as FATAL and DROPS the
-- operation from its upload queue — the driver is never told, and the answer
-- they were forced to give is simply gone. An answer given in a dead zone can
-- reach Postgres days later, against a survey since retired or well outside the
-- interval, and it must still land. Tightening this side alone silently deletes
-- drivers' answers.
--
--   npm run test:db:survey
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

BEGIN;
SET search_path TO extensions, public, "$user";
SELECT plan(42);

-- ── Test harness ────────────────────────────────────────────────────────────
create temp table _res(id serial, name text, expected text, actual text, pass bool) on commit drop;

-- run SQL as a given clerk subject under role `authenticated`, record outcome.
-- expected: 'ok' | 'denied' | an integer string (row count from a select)
create or replace function _as(p_name text, p_sub text, p_sql text, p_expected text)
returns void language plpgsql as $fn$
declare
  n bigint;
  act text;
begin
  begin
    perform set_config('request.jwt.claims',
      json_build_object('sub', p_sub, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    if p_expected ~ '^\d+$' then
      execute 'select count(*) from (' || p_sql || ') _q' into n;
      act := n::text;
    else
      execute p_sql;
      get diagnostics n = row_count;
      -- a write that matched zero rows is an RLS silent-filter denial
      if p_sql ~* '^\s*(update|delete)' and n = 0 then
        act := 'denied';
      else
        act := 'ok';
      end if;
    end if;
  exception
    when insufficient_privilege then act := 'denied';
    when others then act := 'denied:' || SQLSTATE;
  end;
  execute 'reset role';
  insert into _res(name, expected, actual, pass)
    values (p_name, p_expected, act,
            act = p_expected or (p_expected='denied' and act like 'denied%'));
end;
$fn$;

-- ── Fixtures ────────────────────────────────────────────────────────────────
\set drvA_u  '''aaaaaaaa-0000-4000-8000-000000000001'''
\set drvA_d  '''aaaaaaaa-0000-4000-8000-0000000000d1'''
\set drvB_u  '''bbbbbbbb-0000-4000-8000-000000000001'''
\set drvB_d  '''bbbbbbbb-0000-4000-8000-0000000000d1'''

insert into "Users"(id,email,clerk_user_id,is_admin,is_viewer) values
  (:drvA_u,'rls.drvA@test.local','sub_drv_a',false,false),
  (:drvB_u,'rls.drvB@test.local','sub_drv_b',false,false),
  ('cccccccc-0000-4000-8000-000000000001','rls.admin@test.local','sub_admin',true,false),
  ('dddddddd-0000-4000-8000-000000000001','rls.am@test.local','sub_am',false,false),
  ('eeeeeeee-0000-4000-8000-000000000001','rls.dev@test.local','sub_dev',false,false),
  ('ffffffff-0000-4000-8000-000000000001','rls.viewer@test.local','sub_viewer',false,true),
  ('99999999-0000-4000-8000-000000000001','rls.nobody@test.local','sub_nobody',false,false);

insert into "Drivers"(id,user_uuid,is_active) values
  (:drvA_d,:drvA_u,true),
  (:drvB_d,:drvB_u,true);

insert into "AccountManagers"(user_uuid,is_active) values ('dddddddd-0000-4000-8000-000000000001',true);
insert into "Developers"(user_uuid,is_active)      values ('eeeeeeee-0000-4000-8000-000000000001',true);

-- one existing answer per driver (as superuser, bypassing RLS)
insert into "DriverSurveyResponses"
  (id, submission_uuid, survey_uuid, question_uuid, driver_uuid, user_uuid,
   score, reason_text, prompt_snapshot, submitted_at)
values
  ('a1111111-0000-4000-8000-000000000001', gen_random_uuid(),
   '8f3d1c26-9a1e-4b7a-9c2f-3d5e6a7b8c90','c1b2a3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
   :drvA_d, :drvA_u, 9, null, 'How satisfied are you overall with the mobile app?', now()),
  ('b1111111-0000-4000-8000-000000000001', gen_random_uuid(),
   '8f3d1c26-9a1e-4b7a-9c2f-3d5e6a7b8c90','c1b2a3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
   :drvB_d, :drvB_u, 4, 'too slow', 'How satisfied are you overall with the mobile app?', now());

-- sanity: helpers resolve correctly

-- ══ 1. Driver isolation on DriverSurveyResponses ════════════════════════════
select _as('drvA sees only own responses (of the 2 fixtures)','sub_drv_a',
  $$select 1 from "DriverSurveyResponses" where id in ('a1111111-0000-4000-8000-000000000001','b1111111-0000-4000-8000-000000000001')$$,'1');
select _as('drvA cannot see drvB row specifically','sub_drv_a',
  $$select 1 from "DriverSurveyResponses" where id='b1111111-0000-4000-8000-000000000001'$$,'0');
select _as('drvB sees only own responses','sub_drv_b',
  $$select 1 from "DriverSurveyResponses" where id in ('a1111111-0000-4000-8000-000000000001','b1111111-0000-4000-8000-000000000001')$$,'1');

-- ══ 2. Driver insert: own only ══════════════════════════════════════════════
select _as('drvA inserts own answer','sub_drv_a',
  $$insert into "DriverSurveyResponses"(submission_uuid,survey_uuid,question_uuid,driver_uuid,user_uuid,score,prompt_snapshot,submitted_at)
    values (gen_random_uuid(),'8f3d1c26-9a1e-4b7a-9c2f-3d5e6a7b8c90','c1b2a3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d','aaaaaaaa-0000-4000-8000-0000000000d1','aaaaaaaa-0000-4000-8000-000000000001',8,'How satisfied are you overall with the mobile app?',now())$$,'ok');
select _as('drvA CANNOT insert on behalf of drvB','sub_drv_a',
  $$insert into "DriverSurveyResponses"(submission_uuid,survey_uuid,question_uuid,driver_uuid,user_uuid,score,prompt_snapshot,submitted_at)
    values (gen_random_uuid(),'8f3d1c26-9a1e-4b7a-9c2f-3d5e6a7b8c90','c1b2a3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d','bbbbbbbb-0000-4000-8000-0000000000d1','bbbbbbbb-0000-4000-8000-000000000001',8,'How satisfied are you overall with the mobile app?',now())$$,'denied');

-- ══ 3. Driver cannot UPDATE / DELETE own answer ═════════════════════════════
select _as('drvA CANNOT update own answer','sub_drv_a',
  $$update "DriverSurveyResponses" set score=1, reason_text='changed my mind' where id='a1111111-0000-4000-8000-000000000001'$$,'denied');
select _as('drvA CANNOT delete own answer','sub_drv_a',
  $$delete from "DriverSurveyResponses" where id='a1111111-0000-4000-8000-000000000001'$$,'denied');

-- ══ 4. Office roles see everything ══════════════════════════════════════════
select _as('admin sees both fixture rows','sub_admin',
  $$select 1 from "DriverSurveyResponses" where id in ('a1111111-0000-4000-8000-000000000001','b1111111-0000-4000-8000-000000000001')$$,'2');
select _as('account_manager sees both','sub_am',
  $$select 1 from "DriverSurveyResponses" where id in ('a1111111-0000-4000-8000-000000000001','b1111111-0000-4000-8000-000000000001')$$,'2');
select _as('developer sees both','sub_dev',
  $$select 1 from "DriverSurveyResponses" where id in ('a1111111-0000-4000-8000-000000000001','b1111111-0000-4000-8000-000000000001')$$,'2');
select _as('viewer sees both','sub_viewer',
  $$select 1 from "DriverSurveyResponses" where id in ('a1111111-0000-4000-8000-000000000001','b1111111-0000-4000-8000-000000000001')$$,'2');
select _as('role-less user sees none','sub_nobody',
  $$select 1 from "DriverSurveyResponses" where id in ('a1111111-0000-4000-8000-000000000001','b1111111-0000-4000-8000-000000000001')$$,'0');
select _as('admin can correct an answer','sub_admin',
  $$update "DriverSurveyResponses" set reason_text='admin corrected' where id='b1111111-0000-4000-8000-000000000001'$$,'ok');
select _as('account_manager CANNOT update','sub_am',
  $$update "DriverSurveyResponses" set reason_text='am edit' where id='b1111111-0000-4000-8000-000000000001'$$,'denied');
select _as('developer CANNOT update responses','sub_dev',
  $$update "DriverSurveyResponses" set reason_text='dev edit' where id='b1111111-0000-4000-8000-000000000001'$$,'denied');

-- ══ 5. Definitions readable by driver, writable by admin/developer ══════════
select _as('drvA reads DriverSurveys','sub_drv_a',
  $$select 1 from "DriverSurveys" where id='8f3d1c26-9a1e-4b7a-9c2f-3d5e6a7b8c90'$$,'1');
select _as('drvA reads DriverSurveyQuestions','sub_drv_a',
  $$select 1 from "DriverSurveyQuestions" where id='c1b2a3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d'$$,'1');
select _as('drvA CANNOT update DriverSurveys','sub_drv_a',
  $$update "DriverSurveys" set interval_days=1 where id='8f3d1c26-9a1e-4b7a-9c2f-3d5e6a7b8c90'$$,'denied');
select _as('drvA CANNOT update DriverSurveyQuestions','sub_drv_a',
  $$update "DriverSurveyQuestions" set prompt='hacked' where id='c1b2a3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d'$$,'denied');
select _as('drvA CANNOT insert a survey','sub_drv_a',
  $$insert into "DriverSurveys"(title) values ('rogue')$$,'denied');
select _as('admin CAN update DriverSurveys','sub_admin',
  $$update "DriverSurveys" set interval_days=30 where id='8f3d1c26-9a1e-4b7a-9c2f-3d5e6a7b8c90'$$,'ok');
select _as('developer CAN update DriverSurveyQuestions','sub_dev',
  $$update "DriverSurveyQuestions" set follow_up_prompt='What would make it better?' where id='c1b2a3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d'$$,'ok');
select _as('account_manager CANNOT update DriverSurveys','sub_am',
  $$update "DriverSurveys" set interval_days=7 where id='8f3d1c26-9a1e-4b7a-9c2f-3d5e6a7b8c90'$$,'denied');
select _as('viewer CANNOT update DriverSurveyQuestions','sub_viewer',
  $$update "DriverSurveyQuestions" set prompt='viewer edit' where id='c1b2a3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d'$$,'denied');

-- ══ 6. LATE OFFLINE WRITES MUST PASS (the fatal-drop hazard) ════════════════
-- 6a. answer to a survey that has since been deactivated
update "DriverSurveys" set is_active=false where id='8f3d1c26-9a1e-4b7a-9c2f-3d5e6a7b8c90';
select _as('LATE: answer to a DEACTIVATED survey is accepted','sub_drv_a',
  $$insert into "DriverSurveyResponses"(submission_uuid,survey_uuid,question_uuid,driver_uuid,user_uuid,score,prompt_snapshot,submitted_at)
    values (gen_random_uuid(),'8f3d1c26-9a1e-4b7a-9c2f-3d5e6a7b8c90','c1b2a3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d','aaaaaaaa-0000-4000-8000-0000000000d1','aaaaaaaa-0000-4000-8000-000000000001',7,'How satisfied are you overall with the mobile app?',now())$$,'ok');
update "DriverSurveys" set is_active=true where id='8f3d1c26-9a1e-4b7a-9c2f-3d5e6a7b8c90';

-- 6b. answer to a question that has since been deactivated
update "DriverSurveyQuestions" set is_active=false where id='c1b2a3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
select _as('LATE: answer to a DEACTIVATED question is accepted','sub_drv_a',
  $$insert into "DriverSurveyResponses"(submission_uuid,survey_uuid,question_uuid,driver_uuid,user_uuid,score,prompt_snapshot,submitted_at)
    values (gen_random_uuid(),'8f3d1c26-9a1e-4b7a-9c2f-3d5e6a7b8c90','c1b2a3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d','aaaaaaaa-0000-4000-8000-0000000000d1','aaaaaaaa-0000-4000-8000-000000000001',7,'How satisfied are you overall with the mobile app?',now())$$,'ok');
update "DriverSurveyQuestions" set is_active=true where id='c1b2a3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

-- 6c. submitted_at 40 days in the past (long after the prompt was issued)
select _as('LATE: submitted_at 40 days ago is accepted','sub_drv_a',
  $$insert into "DriverSurveyResponses"(submission_uuid,survey_uuid,question_uuid,driver_uuid,user_uuid,score,prompt_snapshot,submitted_at)
    values (gen_random_uuid(),'8f3d1c26-9a1e-4b7a-9c2f-3d5e6a7b8c90','c1b2a3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d','aaaaaaaa-0000-4000-8000-0000000000d1','aaaaaaaa-0000-4000-8000-000000000001',10,'How satisfied are you overall with the mobile app?',now() - interval '40 days')$$,'ok');

-- 6d. a second answer well inside the 30-day interval (interval NOT enforced server-side)
select _as('LATE: second answer inside the interval is accepted','sub_drv_a',
  $$insert into "DriverSurveyResponses"(submission_uuid,survey_uuid,question_uuid,driver_uuid,user_uuid,score,prompt_snapshot,submitted_at)
    values (gen_random_uuid(),'8f3d1c26-9a1e-4b7a-9c2f-3d5e6a7b8c90','c1b2a3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d','aaaaaaaa-0000-4000-8000-0000000000d1','aaaaaaaa-0000-4000-8000-000000000001',8,'How satisfied are you overall with the mobile app?',now())$$,'ok');

-- 6e. stale prompt_snapshot (wording changed since the phone cached it) must still land
select _as('LATE: stale prompt_snapshot wording is accepted verbatim','sub_drv_a',
  $$insert into "DriverSurveyResponses"(submission_uuid,survey_uuid,question_uuid,driver_uuid,user_uuid,score,prompt_snapshot,submitted_at)
    values (gen_random_uuid(),'8f3d1c26-9a1e-4b7a-9c2f-3d5e6a7b8c90','c1b2a3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d','aaaaaaaa-0000-4000-8000-0000000000d1','aaaaaaaa-0000-4000-8000-000000000001',10,'OLD WORDING the phone had cached',now())$$,'ok');

-- ══ 7. Trigger rules under a REAL driver role (not superuser) ════════════════
select _as('TRIGGER: score 3 with no reason is refused','sub_drv_a',
  $$insert into "DriverSurveyResponses"(submission_uuid,survey_uuid,question_uuid,driver_uuid,user_uuid,score,prompt_snapshot,submitted_at)
    values (gen_random_uuid(),'8f3d1c26-9a1e-4b7a-9c2f-3d5e6a7b8c90','c1b2a3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d','aaaaaaaa-0000-4000-8000-0000000000d1','aaaaaaaa-0000-4000-8000-000000000001',3,'How satisfied are you overall with the mobile app?',now())$$,'denied');
select _as('TRIGGER: score 3 with a reason is accepted','sub_drv_a',
  $$insert into "DriverSurveyResponses"(submission_uuid,survey_uuid,question_uuid,driver_uuid,user_uuid,score,reason_text,prompt_snapshot,submitted_at)
    values (gen_random_uuid(),'8f3d1c26-9a1e-4b7a-9c2f-3d5e6a7b8c90','c1b2a3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d','aaaaaaaa-0000-4000-8000-0000000000d1','aaaaaaaa-0000-4000-8000-000000000001',3,'app is slow','How satisfied are you overall with the mobile app?',now())$$,'ok');
select _as('TRIGGER: score 3 with whitespace-only reason is refused','sub_drv_a',
  $$insert into "DriverSurveyResponses"(submission_uuid,survey_uuid,question_uuid,driver_uuid,user_uuid,score,reason_text,prompt_snapshot,submitted_at)
    values (gen_random_uuid(),'8f3d1c26-9a1e-4b7a-9c2f-3d5e6a7b8c90','c1b2a3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d','aaaaaaaa-0000-4000-8000-0000000000d1','aaaaaaaa-0000-4000-8000-000000000001',3,'   ','How satisfied are you overall with the mobile app?',now())$$,'denied');
select _as('TRIGGER: score 11 is refused by CHECK','sub_drv_a',
  $$insert into "DriverSurveyResponses"(submission_uuid,survey_uuid,question_uuid,driver_uuid,user_uuid,score,prompt_snapshot,submitted_at)
    values (gen_random_uuid(),'8f3d1c26-9a1e-4b7a-9c2f-3d5e6a7b8c90','c1b2a3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d','aaaaaaaa-0000-4000-8000-0000000000d1','aaaaaaaa-0000-4000-8000-000000000001',11,'How satisfied are you overall with the mobile app?',now())$$,'denied');
select _as('TRIGGER: NULL score on a required question is refused','sub_drv_a',
  $$insert into "DriverSurveyResponses"(submission_uuid,survey_uuid,question_uuid,driver_uuid,user_uuid,score,prompt_snapshot,submitted_at)
    values (gen_random_uuid(),'8f3d1c26-9a1e-4b7a-9c2f-3d5e6a7b8c90','c1b2a3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d','aaaaaaaa-0000-4000-8000-0000000000d1','aaaaaaaa-0000-4000-8000-000000000001',null,'How satisfied are you overall with the mobile app?',now())$$,'denied');
select _as('TRIGGER: empty prompt_snapshot is backfilled, not refused','sub_drv_a',
  $$insert into "DriverSurveyResponses"(id,submission_uuid,survey_uuid,question_uuid,driver_uuid,user_uuid,score,prompt_snapshot,submitted_at)
    values ('7fffffff-0000-4000-8000-000000000001',gen_random_uuid(),'8f3d1c26-9a1e-4b7a-9c2f-3d5e6a7b8c90','c1b2a3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d','aaaaaaaa-0000-4000-8000-0000000000d1','aaaaaaaa-0000-4000-8000-000000000001',9,'   ',now())$$,'ok');

-- ══ 8. Inactive driver / inactive user lockout ══════════════════════════════
update "Drivers" set is_active=false where id='bbbbbbbb-0000-4000-8000-0000000000d1';
select _as('deactivated driver cannot insert (get_current_driver_id → null)','sub_drv_b',
  $$insert into "DriverSurveyResponses"(submission_uuid,survey_uuid,question_uuid,driver_uuid,user_uuid,score,prompt_snapshot,submitted_at)
    values (gen_random_uuid(),'8f3d1c26-9a1e-4b7a-9c2f-3d5e6a7b8c90','c1b2a3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d','bbbbbbbb-0000-4000-8000-0000000000d1','bbbbbbbb-0000-4000-8000-000000000001',8,'How satisfied are you overall with the mobile app?',now())$$,'denied');
update "Drivers" set is_active=true where id='bbbbbbbb-0000-4000-8000-0000000000d1';


-- ── The helpers resolve as the policies assume ──────────────────────────────
insert into _res(name, expected, actual, pass)
select 'helper: get_current_driver_id resolves drvA from their JWT', 'ok',
       case when v then 'ok' else 'wrong' end, v
from (
  select (select set_config('request.jwt.claims','{"sub":"sub_drv_a","role":"authenticated"}',true)) is not null
     and public.get_current_driver_id() = 'aaaaaaaa-0000-4000-8000-0000000000d1'::uuid as v
) s;

insert into _res(name, expected, actual, pass)
select 'helper: get_user_roles returns ' || r, 'ok',
       case when got then 'ok' else 'wrong' end, got
from (values
  ('admin','sub_admin'), ('account_manager','sub_am'),
  ('developer','sub_dev'), ('viewer','sub_viewer'),
  ('none (role-less user)','sub_nobody')
) v(r, sub),
lateral (
  select (select set_config('request.jwt.claims',
            json_build_object('sub', v.sub, 'role','authenticated')::text, true)) is not null
     and (case when v.r = 'none (role-less user)'
               then public.get_user_roles() = '{}'::text[]
               else public.get_user_roles() @> array[v.r] end) as got
) g;


-- ── Results ─────────────────────────────────────────────────────────────────

SELECT ok(pass, name) FROM _res ORDER BY id;

SELECT * FROM finish();

ROLLBACK;
