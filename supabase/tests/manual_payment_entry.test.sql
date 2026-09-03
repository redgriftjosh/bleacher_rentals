-- ============================================================================
-- Manual payment entry — constraints and the RLS boundary.
--
-- The write path is local-first: PowerSync replays a client INSERT to PostgREST
-- under the user's Clerk JWT. So this policy is the authorization boundary, and
-- the checks below are the only thing standing between accounting's typo and
-- the ledger. Nothing here is enforced by the dialog.
--
-- Verifies:
--   T1 — an admin may insert a manual row
--   T2 — an account manager may too, on a quote they did not create
--   T3 — a viewer may not
--   T4 — a client cannot write a row claiming to be a Stripe payment
--   T5 — amount_cents = 0 is refused; negatives are allowed
--   T6 — a manual row must name its method and its author
--   T7 — nobody may UPDATE or DELETE a payment row, ever
--
-- See docs/specs/manual-payment-entry.md §4.2, §4.4, T3.
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

BEGIN;
SET search_path TO extensions, public, "$user";

DO $$
DECLARE
  v_admin_id    UUID;
  v_am_id       UUID;
  v_viewer_id   UUID;
  v_event       UUID;
  v_row         UUID;
BEGIN
  -- ── Fixtures ────────────────────────────────────────────────────────────
  INSERT INTO public."Users" (email, clerk_user_id, is_admin)
    VALUES ('t-admin@example.test', 'clerk_t_admin', true)
    RETURNING id INTO v_admin_id;

  INSERT INTO public."Users" (email, clerk_user_id)
    VALUES ('t-am@example.test', 'clerk_t_am')
    RETURNING id INTO v_am_id;

  INSERT INTO public."Users" (email, clerk_user_id, is_viewer)
    VALUES ('t-viewer@example.test', 'clerk_t_viewer', true)
    RETURNING id INTO v_viewer_id;

  INSERT INTO public."AccountManagers" (user_uuid, is_active) VALUES (v_am_id, true);

  -- Any event will do; the policy never looks at it. That is the point of T2.
  SELECT id INTO v_event FROM public."Events" LIMIT 1;
  IF v_event IS NULL THEN
    RAISE EXCEPTION 'no Events row to hang a payment off — seed the database first';
  END IF;

  GRANT INSERT, SELECT, UPDATE, DELETE ON public."PaymentHistory" TO authenticated;

  -- ── T5 / T6 — constraints, checked as the service role so that only the
  -- constraint can be the reason for a refusal ────────────────────────────
  BEGIN
    INSERT INTO public."PaymentHistory"
      (event_uuid, amount_cents, currency, status, payer_name, entry_source,
       payment_method_type, recorded_by_user_uuid)
    VALUES (v_event, 0, 'USD', 'succeeded', 'Zero', 'manual', 'check', v_admin_id);
    RAISE EXCEPTION 'T5 FAILED: a zero-amount payment was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- The mechanism this feature runs on: a refund is a negative row.
  INSERT INTO public."PaymentHistory"
    (event_uuid, amount_cents, currency, status, payer_name, entry_source,
     payment_method_type, recorded_by_user_uuid, reference)
  VALUES (v_event, -270000, 'USD', 'succeeded', 'NSF', 'manual', 'check',
          v_admin_id, 'check 1041')
  RETURNING id INTO v_row;

  BEGIN
    INSERT INTO public."PaymentHistory"
      (event_uuid, amount_cents, currency, status, payer_name, entry_source,
       payment_method_type)
    VALUES (v_event, 5000, 'USD', 'succeeded', 'Anon', 'manual', 'check');
    RAISE EXCEPTION 'T6 FAILED: a manual row without an author was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public."PaymentHistory"
      (event_uuid, amount_cents, currency, status, payer_name, entry_source,
       payment_method_type, recorded_by_user_uuid)
    VALUES (v_event, 5000, 'USD', 'succeeded', 'Anon', 'manual', 'card', v_admin_id);
    RAISE EXCEPTION 'T6 FAILED: a manual row with a non-manual method was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public."PaymentHistory"
      (event_uuid, amount_cents, currency, status, payer_name, entry_source,
       payment_method_type, recorded_by_user_uuid, stripe_payment_intent_id)
    VALUES (v_event, 5000, 'USD', 'succeeded', 'Anon', 'manual', 'check',
            v_admin_id, 'pi_123');
    RAISE EXCEPTION 'T6 FAILED: a manual row carrying a Stripe id was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  RAISE NOTICE 'constraints: OK';
END $$;

-- ── T1–T4, T7 — RLS, each as a real authenticated identity ────────────────
--
-- SET ROLE plus a jwt claim is what PostgREST does; get_user_roles() reads
-- auth.jwt() ->> 'sub' and matches Users.clerk_user_id.

CREATE OR REPLACE FUNCTION pg_temp.insert_as(p_sub TEXT, p_entry_source TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_event UUID;
  v_user  UUID;
BEGIN
  SELECT id INTO v_event FROM public."Events" LIMIT 1;
  SELECT id INTO v_user FROM public."Users" WHERE clerk_user_id = p_sub;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_sub)::text, true);

  INSERT INTO public."PaymentHistory"
    (event_uuid, amount_cents, currency, status, payer_name, entry_source,
     payment_method_type, recorded_by_user_uuid)
  VALUES (v_event, 12345, 'USD', 'succeeded', 'RLS probe', p_entry_source,
          CASE WHEN p_entry_source = 'manual' THEN 'check' ELSE NULL END,
          CASE WHEN p_entry_source = 'manual' THEN v_user ELSE NULL END);

  RESET ROLE;
  RETURN 'allowed';
EXCEPTION
  WHEN insufficient_privilege THEN RESET ROLE; RETURN 'denied';
  WHEN check_violation THEN RESET ROLE; RETURN 'denied';
END $$;

DO $$
DECLARE
  v_result TEXT;
BEGIN
  v_result := pg_temp.insert_as('clerk_t_admin', 'manual');
  IF v_result <> 'allowed' THEN RAISE EXCEPTION 'T1 FAILED: admin was denied (%)', v_result; END IF;

  v_result := pg_temp.insert_as('clerk_t_am', 'manual');
  IF v_result <> 'allowed' THEN RAISE EXCEPTION 'T2 FAILED: account manager was denied (%)', v_result; END IF;

  v_result := pg_temp.insert_as('clerk_t_viewer', 'manual');
  IF v_result <> 'denied' THEN RAISE EXCEPTION 'T3 FAILED: a viewer recorded a payment'; END IF;

  v_result := pg_temp.insert_as('clerk_t_admin', 'stripe');
  IF v_result <> 'denied' THEN RAISE EXCEPTION 'T4 FAILED: a client wrote a row claiming to be Stripe'; END IF;

  RAISE NOTICE 'rls insert: OK';
END $$;

-- T7 — the ledger is append-only. No UPDATE or DELETE policy exists, so every
-- role sees zero rows to change, which is how RLS expresses "forbidden" for a
-- statement that names no rows.
DO $$
DECLARE
  v_updated INT;
  v_deleted INT;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'clerk_t_admin')::text, true);

  UPDATE public."PaymentHistory" SET amount_cents = 1;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  DELETE FROM public."PaymentHistory";
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RESET ROLE;

  IF v_updated <> 0 THEN RAISE EXCEPTION 'T7 FAILED: % payment rows were edited', v_updated; END IF;
  IF v_deleted <> 0 THEN RAISE EXCEPTION 'T7 FAILED: % payment rows were deleted', v_deleted; END IF;

  RAISE NOTICE 'append-only: OK';
END $$;

-- Every check above raises on failure, so reaching here under
-- ON_ERROR_STOP=1 is the pass condition.
SELECT 'manual payment entry: constraints and RLS behave as specified' AS result;
ROLLBACK;
