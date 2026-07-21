-- ============================================================================
-- Cascade deletes for event chat tables
-- ============================================================================
-- WHY THIS EXISTS
--
-- `20260709120000_event_owner_auto_subscribe_chat.sql` added a trigger
-- (events_auto_subscribe_owner) that inserts an "EventSubscriptions" row for
-- every event that has an owner. Because "EventSubscriptions".event_uuid had a
-- plain FK back to "Events" with no ON DELETE behaviour, that trigger made it
-- impossible to delete ANY owned event:
--
--   ERROR: update or delete on table "Events" violates foreign key constraint
--          "EventSubscriptions_event_uuid_fkey" on table "EventSubscriptions"
--
-- The app soft-deletes events (Events.deleted = true), so this is not hit in
-- normal use — but it blocked hard deletes entirely, which broke the RLS test
-- suite (rls_multi_role.test.sql, tests G6/G7/G9) and would block anyone
-- cleaning up data by hand via SQL or the Supabase dashboard.
--
-- HOW THE FIX WORKS
--
-- Postgres does not let you alter a foreign key's ON DELETE action in place, so
-- each constraint must be dropped and recreated with the desired behaviour.
-- Recreating an FK re-validates existing rows, which is cheap here (these are
-- small, recently-added chat tables).
--
-- We use ON DELETE CASCADE rather than SET NULL / RESTRICT because these rows
-- are wholly owned by their parent: a subscription, message, typing indicator,
-- or read receipt has no meaning once the thing it refers to is gone. This
-- matches "EventFiles", which already cascades from "Events".
--
-- IMPORTANT: the cascade has to cover the whole chain. Deleting an event
-- cascades into "EventMessages", and that delete would itself have been blocked
-- by "EventMessageReadReceipts" (which had a plain FK to "EventMessages"), so
-- that constraint is fixed here too. Without it, fixing the top level would
-- just move the failure one level down.
--
-- Resulting delete chain for a hard-deleted event:
--
--   Events
--     ├─→ EventSubscriptions        (cascade, added here)
--     ├─→ EventTypingIndicators     (cascade, added here)
--     └─→ EventMessages             (cascade, added here)
--           ├─→ EventMessageMentions      (cascade, already correct)
--           ├─→ EventMessageReadReceipts  (cascade, added here)
--           └─→ EventMessages.reply_to_message_id
--                                         (set null, already correct — see below)
--
-- Note on reply_to_message_id: it stays ON DELETE SET NULL. That is the right
-- behaviour when a single message is deleted from a live thread (replies
-- survive and simply lose their parent link). During an event-wide cascade
-- every message in the thread is being removed anyway, so SET NULL is harmless.
--
-- This migration is idempotent: each constraint is dropped IF EXISTS before
-- being recreated, so it is safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. EventSubscriptions → Events
--    The table the auto-subscribe trigger writes to; the direct cause of the
--    original failure.
-- ---------------------------------------------------------------------------
ALTER TABLE public."EventSubscriptions"
  DROP CONSTRAINT IF EXISTS "EventSubscriptions_event_uuid_fkey";

ALTER TABLE public."EventSubscriptions"
  ADD CONSTRAINT "EventSubscriptions_event_uuid_fkey"
  FOREIGN KEY (event_uuid) REFERENCES public."Events"(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 2. EventTypingIndicators → Events
--    Ephemeral presence rows. Nothing should keep an event alive because
--    someone was mid-typing.
-- ---------------------------------------------------------------------------
ALTER TABLE public."EventTypingIndicators"
  DROP CONSTRAINT IF EXISTS "EventTypingIndicators_event_uuid_fkey";

ALTER TABLE public."EventTypingIndicators"
  ADD CONSTRAINT "EventTypingIndicators_event_uuid_fkey"
  FOREIGN KEY (event_uuid) REFERENCES public."Events"(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 3. EventMessageReadReceipts → EventMessages
--    Fixed BEFORE the EventMessages cascade below is useful: without this,
--    cascading into EventMessages would fail on read receipts instead.
-- ---------------------------------------------------------------------------
ALTER TABLE public."EventMessageReadReceipts"
  DROP CONSTRAINT IF EXISTS "EventMessageReadReceipts_message_id_fkey";

ALTER TABLE public."EventMessageReadReceipts"
  ADD CONSTRAINT "EventMessageReadReceipts_message_id_fkey"
  FOREIGN KEY (message_id) REFERENCES public."EventMessages"(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 4. EventMessages → Events
--    Done last so the chain below it (mentions + read receipts) already
--    cascades cleanly by the time this is in place.
-- ---------------------------------------------------------------------------
ALTER TABLE public."EventMessages"
  DROP CONSTRAINT IF EXISTS "EventMessages_event_uuid_fkey";

ALTER TABLE public."EventMessages"
  ADD CONSTRAINT "EventMessages_event_uuid_fkey"
  FOREIGN KEY (event_uuid) REFERENCES public."Events"(id) ON DELETE CASCADE;
