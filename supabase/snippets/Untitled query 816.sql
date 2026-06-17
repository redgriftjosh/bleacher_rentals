SELECT
  *,
  NOW() AS current_date_time
FROM public."WorkTrackers"
WHERE created_at > '2026-06-14';