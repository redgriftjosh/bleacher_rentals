-- Link work tracker POC fields to real contact records.
--
-- The existing pickup_poc / dropoff_poc text columns are kept as the denormalised display
-- value: the Bill of Lading must print the POC as dispatched, and pre-existing rows hold free
-- text that has no contact behind it. See docs/specs/work-tracker-poc-contacts.md.
alter table public."WorkTrackers"
  add column if not exists pickup_poc_contact_uuid uuid references public."Contacts"("id"),
  add column if not exists dropoff_poc_contact_uuid uuid references public."Contacts"("id");
