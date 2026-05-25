# Work Tracker Pickup Address Mismatch Alert

Fires when a work tracker's pickup address does not match the bleacher's last known location. The "last known location" is resolved by looking at all events and work trackers for this bleacher that occurred on or before the work tracker's date, then taking the most recent address (events take precedence over work trackers on the same date).

## What Triggers the Alert

A pickup address mismatch is detected when all of these are true:
- The work tracker has a `bleacher_uuid` and a `date`
- The work tracker has a `pickup_address_uuid` that resolves to a street
- The resolved pickup street does NOT match the bleacher's last known location street (case-insensitive, trimmed)

If the bleacher has no prior address history (no events or work trackers with addresses before this date), no alert is produced — there's nothing to compare against.

## Entity Type

`work_tracker` — each work tracker carries its own alert independently.

**Note:** The `work_tracker` value must be added to the `alert_entity_type` enum in Supabase before alerts can be persisted to the database. Run:
```sql
ALTER TYPE alert_entity_type ADD VALUE 'work_tracker';
```

## Entry Points

- **`evaluate()`** — Pure logic. Checks a single work tracker's pickup address against the bleacher's last known location. Returns one alert payload if mismatched, empty array otherwise.
- **`sync()`** — Diffs evaluated alerts against the DB and inserts/updates/deletes to match.
- **`delete()`** — Removes all alerts of this type for a given work tracker.
- **`syncForWorkTracker(workTrackerUuid, ...)`** — Fetches the work tracker and all related data, then evaluates and syncs. Call after saving a work tracker.

## UI Integration

The WorkTrackerModal highlights the pickup address field with a red border and shows a warning tooltip when a mismatch is detected client-side (via `evaluate()`). This runs live as the user edits — no save required to see the warning.
