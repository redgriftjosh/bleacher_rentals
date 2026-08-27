-- ============================================================================
-- Driver Satisfaction Score — the survey a driver cannot dismiss.
--
-- One question today ("How satisfied are you overall with the mobile app?",
-- 1-10, a written reason required at 6 or below). Next quarter it becomes
-- weekly and grows questions about the work itself and about pay. The shape
-- below is built for that second life, not just the first.
--
-- WHY THERE ARE NO CALENDAR CYCLES
--
-- The cadence is personal, not calendar-based: a driver is asked on their
-- first launch after their first completed trip, and again once
-- `interval_days` have passed since their last submission. Someone who
-- disappears for six months is asked ONCE on their return, not handed a queue
-- of six missed months. That rule needs no cycle rows, no scheduler and no
-- cron: it is `max(submitted_at) < now - interval`, computed on the device from
-- data it already holds, and it therefore keeps working with the phone in a
-- dead zone — which is the premise of the driver app.
--
-- WHY ONE TABLE OF ANSWERS AND NOT A SUBMISSION PARENT
--
-- A row here is one question answered. Everything about the submission it
-- belongs to — driver, survey, timestamp, app build — sits on the row itself,
-- and `submission_uuid` groups the rows written together. A parent table would
-- buy grouping and nothing else, at a real price:
--
--   * the RLS below would become a correlated subquery on every answer row
--     instead of one column comparison;
--   * every read — the mobile gate, the web report, the sync rules — would
--     carry an extra join;
--   * and one submission would cross the sync boundary as two dependent
--     writes. PowerSync replays CRUD in recorded order, so a parent rejected
--     for any reason leaves its children pointing at nothing; they are refused
--     in turn and dropped from the outbox without a word. One row per answer
--     has no such failure to sequence around.
--
-- The price paid instead is six columns repeated per answer. With one to three
-- questions and a fleet of drivers that is nothing, and the rows of one
-- submission are written in a single local transaction, so they cannot drift
-- apart.
--
-- One consequence worth stating: a submission with no answers cannot be
-- recorded, because a submission IS its answers. Should a future survey make
-- every question optional, it must still write at least one row — otherwise
-- the device sees no submission and asks again tomorrow.
--
-- WHY THE QUESTION TEXT LIVES HERE AND NOT IN THE APP
--
-- Questions are rows. Changing one is an UPDATE that reaches every phone on
-- the next sync — never a new build and a wait on App Store review. This
-- migration seeds the first one; a web editor for them lands next quarter and
-- needs no schema change, only the admin write policies already granted below.
--
-- WHY EVERY ANSWER CARRIES A COPY OF ITS QUESTION
--
-- `prompt_snapshot` is the exact wording the driver was shown. Once the
-- wording is editable, a report that joined live question text would silently
-- re-label historical answers with a question nobody was ever asked. The
-- snapshot is what makes "average score for August" mean something a year from
-- now.
--
-- WHAT IS DELIBERATELY *NOT* ENFORCED HERE
--
-- The interval, and whether the survey is still active at the moment the row
-- lands. Both are clock- and state-dependent, and the app is offline-first: an
-- answer given on a phone with no signal can reach Postgres days later.
-- PowerSync classifies an RLS refusal (42501) and a constraint violation
-- (23xxx) as FATAL and DROPS the operation from its upload queue — the driver
-- is never told, and the answer they were forced to give is simply gone. So
-- the server is deliberately the more permissive of the two sides on anything
-- involving time. What IS enforced (score range, reason-below-threshold) is
-- mirrored character for character by the client, in
-- features/driver-survey/utils/surveyValidation.ts in br_driver — keep the two
-- in step, and never tighten this side alone.
-- ============================================================================

-- ── 1. Tables ───────────────────────────────────────────────────────────────

-- A survey definition. One row today; a second ("Job & Pay", interval 7)
-- is how next quarter's weekly survey arrives, with no migration.
create table if not exists public."DriverSurveys" (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  -- How long after a submission the same driver is asked again. 30 today,
  -- 7 next quarter. A number in a row, not a constant in a mobile build.
  interval_days integer not null default 30
    check (interval_days between 1 and 365),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public."DriverSurveyQuestions" (
  id uuid primary key default gen_random_uuid(),
  survey_uuid uuid not null
    references public."DriverSurveys"(id) on delete cascade,
  prompt text not null,
  -- 'scale_1_10' — the numeric scale plus its conditional follow-up.
  -- 'text'       — free text on its own (nothing uses it yet; it exists so
  --                next quarter's questions do not need a migration).
  kind text not null default 'scale_1_10'
    check (kind in ('scale_1_10', 'text')),
  -- At or below this score the written reason becomes mandatory. NULL means
  -- the follow-up never fires. 6 for the app-satisfaction question — and a
  -- column rather than a constant because the threshold is a product decision
  -- that will be retuned without shipping a build.
  follow_up_max_score integer
    check (follow_up_max_score between 1 and 10),
  follow_up_prompt text,
  is_required boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per question answered. See the header for why there is no parent
-- submission table.
--
-- No unique constraint on (survey, driver) and there must not be one: the
-- point of the feature is that the same driver answers the same survey again
-- every interval, and that history is the trend the web page plots.
create table if not exists public."DriverSurveyResponses" (
  id uuid primary key default gen_random_uuid(),
  -- Groups the rows a driver submitted together. Written by the client, the
  -- same value on every row of one submission. With a single question it is
  -- one row per submission; with next quarter's it is several.
  submission_uuid uuid not null,
  survey_uuid uuid not null
    references public."DriverSurveys"(id) on delete cascade,
  question_uuid uuid not null
    references public."DriverSurveyQuestions"(id) on delete cascade,
  driver_uuid uuid not null
    references public."Drivers"(id) on delete cascade,
  -- Denormalised on purpose: the web page shows who answered, and reading it
  -- from here saves every row a join through Drivers.
  user_uuid uuid references public."Users"(id) on delete set null,
  score integer check (score between 1 and 10),
  reason_text text,
  -- The wording actually shown on the phone. See the header.
  prompt_snapshot text not null,
  -- Written by the client, not defaulted. The default would stamp the moment
  -- of *sync*: an answer given offline on the 1st and synced on the 4th would
  -- push the driver's next prompt three days out and land in the wrong month
  -- on the report. The cost is that the cadence is measured against a device
  -- clock; the blast radius of a wrong one is one driver asked early.
  submitted_at timestamptz not null default now(),
  -- Which build the opinion was formed on. The first question is about the app
  -- itself, so "4.2 scores worse than 4.1" is exactly the finding wanted.
  app_version text,
  app_platform text,
  created_at timestamptz not null default now()
);

-- ── 2. Indexes ──────────────────────────────────────────────────────────────

create index if not exists "DriverSurveyQuestions_survey_uuid_idx"
  on public."DriverSurveyQuestions" (survey_uuid);

-- The one read the gate performs on every launch: "when did this driver last
-- answer this survey?"
create index if not exists "DriverSurveyResponses_driver_survey_submitted_idx"
  on public."DriverSurveyResponses" (driver_uuid, survey_uuid, submitted_at desc);

-- Reporting reads by time, and groups by submission.
create index if not exists "DriverSurveyResponses_submitted_at_idx"
  on public."DriverSurveyResponses" (submitted_at desc);

create index if not exists "DriverSurveyResponses_submission_uuid_idx"
  on public."DriverSurveyResponses" (submission_uuid);

-- ── 3. RLS ──────────────────────────────────────────────────────────────────

alter table public."DriverSurveys"          enable row level security;
alter table public."DriverSurveyQuestions"  enable row level security;
alter table public."DriverSurveyResponses"  enable row level security;

-- Definitions: readable by every authenticated user (a driver needs the
-- question to be able to answer it), writable by admin and developer only.
-- The write policies exist now so next quarter's question editor in the web
-- app is pure frontend work.

drop policy if exists "driver_surveys_select" on public."DriverSurveys";
create policy "driver_surveys_select" on public."DriverSurveys"
  as permissive for select to authenticated
  using (true);

drop policy if exists "driver_surveys_write" on public."DriverSurveys";
create policy "driver_surveys_write" on public."DriverSurveys"
  as permissive for all to authenticated
  using (public.get_user_roles() && '{admin,developer}'::text[])
  with check (public.get_user_roles() && '{admin,developer}'::text[]);

drop policy if exists "driver_survey_questions_select" on public."DriverSurveyQuestions";
create policy "driver_survey_questions_select" on public."DriverSurveyQuestions"
  as permissive for select to authenticated
  using (true);

drop policy if exists "driver_survey_questions_write" on public."DriverSurveyQuestions";
create policy "driver_survey_questions_write" on public."DriverSurveyQuestions"
  as permissive for all to authenticated
  using (public.get_user_roles() && '{admin,developer}'::text[])
  with check (public.get_user_roles() && '{admin,developer}'::text[]);

-- Answers: a driver sees their own and files their own. The office sees all.
--
-- The survey is NOT anonymous — an explicit product decision. A low score with
-- no name attached cannot be followed up, and following up is the point.
--
-- Both policies are a single column comparison. That is the dividend of having
-- no parent table: with one, each of these would be a correlated EXISTS
-- against another table, evaluated per row.

drop policy if exists "driver_survey_responses_select" on public."DriverSurveyResponses";
create policy "driver_survey_responses_select" on public."DriverSurveyResponses"
  as permissive for select to authenticated
  using (
    driver_uuid = public.get_current_driver_id()
    or public.get_user_roles() && '{admin,account_manager,developer,viewer}'::text[]
  );

-- Note what is absent: any mention of the survey being active, or of the
-- interval having elapsed. Both would reject late-arriving offline answers,
-- and a rejected write here is a deleted write. See the header.
drop policy if exists "driver_survey_responses_insert" on public."DriverSurveyResponses";
create policy "driver_survey_responses_insert" on public."DriverSurveyResponses"
  as permissive for insert to authenticated
  with check (driver_uuid = public.get_current_driver_id());

-- No update and no delete for a driver: a submitted opinion is a record, not a
-- document. Admin keeps full control for corrections.
drop policy if exists "driver_survey_responses_admin_write" on public."DriverSurveyResponses";
create policy "driver_survey_responses_admin_write" on public."DriverSurveyResponses"
  as permissive for all to authenticated
  using (public.get_user_roles() && '{admin}'::text[])
  with check (public.get_user_roles() && '{admin}'::text[]);

-- ── 4. Guard trigger ────────────────────────────────────────────────────────

create or replace function public.enforce_driver_survey_answer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  q record;
begin
  select prompt, kind, follow_up_max_score, is_required, survey_uuid
    into q
  from public."DriverSurveyQuestions"
  where id = new.question_uuid;

  if q is null then
    raise exception 'Unknown survey question %', new.question_uuid
      using errcode = 'foreign_key_violation';
  end if;

  -- Forgiving, not fatal — twice over. A snapshot the client failed to send is
  -- a cosmetic loss and a survey_uuid that disagrees with the question is a
  -- client bug; refusing either would delete the driver's answer instead of
  -- correcting it (fatal-drop, see the header).
  if new.prompt_snapshot is null or btrim(new.prompt_snapshot) = '' then
    new.prompt_snapshot := q.prompt;
  end if;

  if new.survey_uuid is distinct from q.survey_uuid then
    new.survey_uuid := q.survey_uuid;
  end if;

  if q.kind = 'scale_1_10' then
    if q.is_required and new.score is null then
      raise exception 'A score is required for question %', new.question_uuid
        using errcode = 'check_violation';
    end if;

    if new.score is not null
       and q.follow_up_max_score is not null
       and new.score <= q.follow_up_max_score
       and (new.reason_text is null or btrim(new.reason_text) = '')
    then
      raise exception
        'A written reason is required when the score is % or below',
        q.follow_up_max_score
        using errcode = 'check_violation';
    end if;
  end if;

  -- Never store whitespace as if it were an answer.
  if new.reason_text is not null and btrim(new.reason_text) = '' then
    new.reason_text := null;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_driver_survey_answer on public."DriverSurveyResponses";
create trigger enforce_driver_survey_answer
  before insert or update on public."DriverSurveyResponses"
  for each row
  execute function public.enforce_driver_survey_answer();

comment on function public.enforce_driver_survey_answer() is
  'Driver Satisfaction guard: score present and in range for scale questions, a '
  'written reason mandatory at or below the question''s follow_up_max_score, and '
  'prompt_snapshot / survey_uuid corrected rather than refused. Mirrored exactly '
  'by the mobile client (features/driver-survey/utils/surveyValidation.ts in '
  'br_driver) because PowerSync drops server-rejected writes from the outbox in '
  'silence.';

-- ── 5. Seed: the survey that ships this quarter ─────────────────────────────

insert into public."DriverSurveys" (id, title, interval_days, is_active, sort_order)
values (
  '8f3d1c26-9a1e-4b7a-9c2f-3d5e6a7b8c90',
  'Mobile App Satisfaction',
  30,
  true,
  0
)
on conflict (id) do nothing;

insert into public."DriverSurveyQuestions" (
  id, survey_uuid, prompt, kind, follow_up_max_score, follow_up_prompt,
  is_required, is_active, sort_order
)
values (
  'c1b2a3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
  '8f3d1c26-9a1e-4b7a-9c2f-3d5e6a7b8c90',
  'How satisfied are you overall with the mobile app?',
  'scale_1_10',
  6,
  'What would make it better?',
  true,
  true,
  0
)
on conflict (id) do nothing;
