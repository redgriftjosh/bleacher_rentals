# Event Requirements Alert

Fires when the bleachers assigned to a booked event don't satisfy the event's requirements. Scoped to the event (entity_type = `"event"`).

## Two Modes

### Lenient (`event.lenient = true`)
The event specifies a total **seat count**. An alert fires if the sum of seats across all assigned bleachers doesn't exactly equal `event.seats`. Produces at most one alert.

### Strict (`event.lenient = false`)
The event specifies exact counts of **7-row, 10-row, and 15-row** bleachers. An alert fires if any row-type's assigned count doesn't match the required count. Produces one alert listing all mismatches.

## `useDateWindow` Flag

`evaluate()` accepts an optional `useDateWindow` flag. When `true`, alerts are only produced for events with a start date of today or later (using `parseDateLocal` to avoid UTC skew). When `false` or omitted (client-side), all mismatches are shown regardless of date. This means past events still show alerts in the UI for visibility, but won't persist them to the database.

## Entry Points

- **`evaluate()`** — Pure logic. Takes the event state, full bleacher list, and optional `useDateWindow` flag. Returns alert payloads for any mismatches.
- **`sync()`** — Diffs evaluated alerts against the DB and inserts/updates/deletes to match.
- **`delete()`** — Removes all alerts of this type for a given event (used when deleting an event).
