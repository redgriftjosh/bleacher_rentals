-- Add quote_valid_till column to Events for quote expiration date
ALTER TABLE public."Events"
  ADD COLUMN IF NOT EXISTS quote_valid_till date;
