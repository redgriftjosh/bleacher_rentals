-- ============================================================================
-- Tests for created_by_user_uuid DEFAULT on DamageReports
-- Migration: 20260624130000_damage_reports_created_by_default.sql
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

BEGIN;
SET search_path TO extensions, public, "$user";
SELECT plan(2);

SELECT isnt(
  (SELECT column_default::text
   FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'DamageReports'
     AND column_name  = 'created_by_user_uuid'),
  NULL,
  'created_by_user_uuid should have a default'
);

SELECT ok(
  (SELECT column_default::text
   FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'DamageReports'
     AND column_name  = 'created_by_user_uuid') LIKE '%get_current_user_uuid%',
  'default should call get_current_user_uuid()'
);

SELECT * FROM finish();

ROLLBACK;
