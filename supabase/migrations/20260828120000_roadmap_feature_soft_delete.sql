-- =============================================================
-- Soft delete for RoadmapFeatures
--
-- RoadmapTasks already carries `deleted_at`; features were hard-deleted.
-- Deleting a feature now stamps `deleted_at` instead, so it can be restored
-- and so linked tasks keep their `feature_id` reference intact.
--
-- Every read path over RoadmapFeatures must filter `deleted_at is null`.
-- =============================================================

alter table public."RoadmapFeatures"
  add column if not exists deleted_at timestamptz;

create index if not exists "RoadmapFeatures_deleted_at_idx"
  on public."RoadmapFeatures" (deleted_at);
