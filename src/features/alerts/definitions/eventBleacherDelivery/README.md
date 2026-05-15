# Bleacher Delivery Not Confirmed Alert

Fires when a bleacher assigned to a booked event has no work tracker delivering it to the event's address on or before the event start date. Scoped per `BleacherEvent` row (entity_type = `"bleacher_event"`), so each bleacher-event pair carries its own alert independently.

## What Counts as a Confirmed Delivery

A work tracker satisfies the delivery check when all of these are true:
- Its `bleacher_uuid` matches the bleacher event's bleacher
- Its `date` is on or before `event_start`
- Its `dropoff_address_uuid` resolves to a street that matches the event's address street (case-insensitive, trimmed)

## `useDateWindow` Flag

`evaluate()` accepts an optional `useDateWindow` flag. When `true`, alerts are only produced for booked events with a start date between today and next Sunday (using `parseDateLocal` to avoid UTC skew). When `false` or omitted (client-side), all booked events with a missing delivery are flagged regardless of date. This means past events still show alerts in the event configuration form for visibility, but won't persist them to the database.

## Entry Points

- **`evaluate()`** — Pure logic. Checks a single bleacher-event pair against work trackers and addresses. Returns one alert payload if no matching delivery exists, empty array otherwise.
- **`sync()`** — Diffs evaluated alerts against the DB and inserts/updates/deletes to match.
- **`delete()`** — Removes all alerts of this type for a given bleacher-event.
- **`syncForEvent(eventUuid, ...)`** — Fetches all bleacher-events for an event, then evaluates and syncs each one. Call after creating or updating an event.
- **`syncForBleacher(bleacherUuid, ...)`** — Fetches all bleacher-events for a bleacher, then evaluates and syncs each one. Call after saving or deleting a work tracker.
- **`deleteForEvent(eventUuid, ...)`** — Removes all delivery alerts for every bleacher-event belonging to an event. Call before deleting an event.
