-- Auto-populate created_by_user_uuid with the current authenticated user
ALTER TABLE public."DamageReports"
  ALTER COLUMN created_by_user_uuid SET DEFAULT public.get_current_user_uuid();
