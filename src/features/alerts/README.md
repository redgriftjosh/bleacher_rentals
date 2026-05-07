# Alerts Feature

## Directory Structure

```
src/features/alerts/
  AlertDefinition.ts       ← abstract contract (evaluate + sync + delete)
  types.ts                 ← AlertPayload type + AlertEntityType enum alias
  definitions/             ← one file per alert
    eventRequirements.ts
    schedulingConflicts.ts
    (add new alerts here)
  hooks/
    useUserAlerts.ts       ← PowerSync-first reactive read hook
  components/              ← UI (AlertsDropDown, AlertDropDownListItem, etc.)
  util/
    syncAlerts.ts          ← syncAlertsForEntity / deleteAlertsForEntity helpers
    eventEntityDescription.ts ← builds "Event Name — Address" description string
```

## Database Schema

Two tables, two responsibilities:

- **`Alerts`** — the alert itself. One row per unique alert condition, shared across all users. Columns mirror `AlertPayload`.
- **`UserAlerts`** — per-user state. One row per (user × alert). Tracks `dismissed` and `dismissed_until`. 50 users receiving the same alert = one `Alerts` row + 50 `UserAlerts` rows.

## Architecture

### `AlertDefinition<TContext>` (abstract contract)

Every alert definition extends this class. All four members are abstract — each definition provides its own implementation:

| Method                                      | Purpose                                                        |
| ------------------------------------------- | -------------------------------------------------------------- |
| `title`                                     | Unique string that scopes DB rows to this definition           |
| `evaluate(context)`                         | Pure function — returns current `AlertPayload[]` given context |
| `sync(entityUuid, entityType, alerts, ...)` | Persists this definition's alerts to Supabase                  |
| `delete(entityUuid, ...)`                   | Removes this definition's alerts on entity deletion            |

Definitions own their sync logic. Shared persistence code lives in `util/syncAlerts.ts` — import `syncAlertsForEntity` and `deleteAlertsForEntity` rather than duplicating it.

### `definitions/`

Each file owns one alert domain. It defines:

- **When** the alert fires
- **What** the alert says (`title`, `message`, `entity_description`)
- **Which entity** it belongs to
- **How** to sync (simple single-entity sync or multi-event `syncAll`)

Each file exports a singleton instance. Example:

```typescript
// definitions/eventRequirements.ts
class EventRequirementsDefinition extends AlertDefinition<{
  event: CurrentEventState;
  bleachers: Tables<"Bleachers">[];
}> {
  readonly title = "Event Requirements Not Met";

  evaluate({ event, bleachers }) {
    // returns AlertPayload[] based on bleacher assignment rules
  }

  async sync(entityUuid, entityType, alerts, saverUserUuid, ownerUserUuid, supabase) {
    await syncAlertsForEntity(
      this.title,
      entityUuid,
      entityType,
      alerts,
      saverUserUuid,
      ownerUserUuid,
      supabase,
    );
  }

  async delete(entityUuid, supabase) {
    await deleteAlertsForEntity(this.title, entityUuid, supabase);
  }
}

export const eventRequirements = new EventRequirementsDefinition();
```

`schedulingConflicts` also exposes a `syncAll()` method that syncs the current event **and** every other event sharing a bleacher with it (including events that currently have a conflict alert in the DB). Always call `syncAll` from the form — not `sync` — for scheduling conflicts.

### `util/syncAlerts.ts`

- **`syncAlertsForEntity`** — diffs alerts for a single entity: deletes removed, updates `entity_description` on unchanged, inserts new (+ creates `UserAlerts` rows).
- **`deleteAlertsForEntity`** — removes all of a definition's alerts and their `UserAlerts` rows for a deleted entity.

### `hooks/useUserAlerts.ts`

PowerSync-first reactive read. Queries `UserAlerts JOIN Alerts` locally. Exposes `activeAlerts`, `dismissedAlerts`, mutation helpers (`dismiss`, `remindLater`, `undismiss`).

### `types.ts`

- `AlertPayload` — the in-memory shape shared between `evaluate()` output and `sync()` input. Mirrors the `Alerts` table columns.
- `AlertEntityType` — alias for `Database["public"]["Enums"]["alert_entity_type"]`. Extend the DB enum to add new entity types; this type updates automatically after `npm run gtl`.

## Data Flow

```
definitions/eventRequirements.ts     definitions/schedulingConflicts.ts
         │ .evaluate(context)                  │ .evaluate(context)
         └──────────────┬───────────────────────┘
                        ▼
          useCurrentEventStore (alerts: AlertPayload[])
                        │  on save / update
                        ▼
    eventRequirements.sync(entityUuid, "event", state.alerts, ...)
    schedulingConflicts.syncAll(entityUuid, context, ...)  ← also updates other affected events
              ──►  Supabase (Alerts + UserAlerts)
                        │ synced via PowerSync
                        ▼
               useUserAlerts.ts  ──►  UI
```

## Adding a New Alert

1. Create `definitions/myNewAlert.ts` extending `AlertDefinition<YourContext>`
2. Implement `title` and `evaluate()` — the alert logic
3. Implement `sync()` using `syncAlertsForEntity` from `util/syncAlerts.ts`
4. Implement `delete()` using `deleteAlertsForEntity` from `util/syncAlerts.ts`
5. If your alert affects multiple entities at once (like scheduling conflicts), add a `syncAll()` that calls `syncAlertsForEntity` for each affected entity
6. Call `.sync()` / `.syncAll()` at the relevant save points and `.delete()` at delete points in the form component
7. Call `.evaluate()` inside `updateCurrentEventAlerts()` in `dashboard/functions.ts` to populate the store

## Rules

1. **Alert logic lives in `definitions/`** — never hardcode `title`, `message`, or entity metadata elsewhere.
2. **`sync` and `delete` are always called as methods on the definition instance** — never raw Supabase queries for alert persistence in components.
3. **Each definition only manages its own rows**, scoped by `title`. Multiple definitions coexist safely for the same entity.
4. **Reads are always PowerSync-first** via `useUserAlerts`. Never query Supabase directly for alerts in the UI.
5. **Per-user state (`dismissed`, `dismissed_until`) lives only in `UserAlerts`**, never on `Alerts`.
