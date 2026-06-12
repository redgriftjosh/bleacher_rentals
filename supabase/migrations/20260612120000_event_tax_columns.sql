alter table "Events" add column if not exists tax_percent numeric;
alter table "Events" add column if not exists tax_amount_cents integer;
