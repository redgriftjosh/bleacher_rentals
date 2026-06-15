-- Add phone to SalesOffices
alter table public."SalesOffices"
  add column phone text null;

-- Add po_number to Events (Purchase Order # from client)
alter table public."Events"
  add column po_number text null;
