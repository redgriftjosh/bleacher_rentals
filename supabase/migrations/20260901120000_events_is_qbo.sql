-- ============================================================================
-- Events.is_qbo — has this quote/booking been entered into QuickBooks Online?
--
-- A manual bookkeeping flag toggled by hand from the Billing tab of
-- /quotes-bookings/[id]. It records a human's statement ("I put this one into
-- QBO"), NOT the state of the QuickBooks integration — nothing in the sync
-- code writes it. Default false: every existing and future event starts
-- unmarked until someone says otherwise.
-- ============================================================================

alter table public."Events"
  add column if not exists is_qbo boolean not null default false;

comment on column public."Events".is_qbo is
  'Manually set from the Billing tab: true once someone has entered this event '
  'into QuickBooks Online. Not written by the QBO integration.';
