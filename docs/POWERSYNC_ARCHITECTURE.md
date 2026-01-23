# PowerSync-First Data Access (Local-First)

This repo is moving toward a **PowerSync-first** architecture.

The goal is:

- **Local-first UI** (fast, offline-tolerant)
- **Reactive updates** (UI updates when the local DB changes)
- **Type-safe DB access** (Kysely queries + enforced result types)

In practice, this means: **prefer PowerSync (`db` / `powerSyncDb`) over the Supabase client** for app reads and writes.

## The Rule

- For app data access, use:
  - `db` (Kysely wrapper around the local PowerSync DB)
  - `useTypedQuery()` for reactive reads
  - `typedGetAll()` for one-time, non-reactive reads
  - `typedExecute()` for writes/ `typedGetAll()`

- Avoid:
  - `supabase.from(...).select(...)` in UI hooks/components (unless there is too much data to be synced locally and is okay to be online only)

## Reads (Reactive)

Pattern:

1. Build SQL with **Kysely** using `db`.
2. `.compile()` it.
3. Use `useTypedQuery(compiled, expect<YourType>())`.

Example:

```ts
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";

type UserRow = { id: string; firstName: string | null };

const compiled = db
  .selectFrom("Users as u")
  .select(["u.id as id", "u.first_name as firstName"])
  .limit(1)
  .compile();

const { data } = useTypedQuery(compiled, expect<UserRow>());
```

Why the `expect<T>()` is required:

- `useTypedQuery` enforces that the compiled query result **exactly matches** `T`.
- If the DB schema changes, TypeScript breaks in a useful place.

## Writes (Local-First)

Writes should mutate the **local PowerSync DB**.
PowerSync will sync changes to the backend depending on your connector/config.

Pattern:

1. Build the write with **Kysely**.
2. `.compile()` it.
3. Execute it with `typedExecute(compiled)`.

Example:

```ts
import { db } from "@/components/providers/SystemProvider";
import { typedExecute } from "@/lib/powersync/typedQuery";

const compiled = db
  .updateTable("DashboardFilterSettings")
  .set({ optimization_mode: 1 })
  .where("user_uuid", "=", userUuid)
  .compile();

await typedExecute(compiled);
```

If you need returned rows (SQLite `RETURNING`):

- Prefer using `typedGetAll(compiled, expect<ReturnType>())` with a `returning(...)` query.

## Important Type Note (Booleans)

In PowerSync schema definitions (`src/lib/powersync/AppSchema.ts`) we commonly store booleans as integers (`0`/`1`) for local tables.

That means:

- reads may come back as `number | null`
- writes should often use `0`/`1`

If you see `true/false` type errors in Kysely inserts/updates, that’s usually why.

## Adding a New Table

When you add a new table intended for PowerSync-first use:

1. Add a Supabase migration in `supabase/migrations/...sql`
2. Update `database.types.ts` (or run `npm run generate-types-local`)
3. Add the table to the PowerSync schema: `src/lib/powersync/AppSchema.ts`
4. If needed, update any app registries keyed by `Database["public"]["Tables"]`
   - example: `src/lib/zustandRegistery.ts`

## Where to Look for Existing Patterns

- `src/features/userAccess/hooks/useUserAccess.ts` (read query pattern)
- `src/lib/powersync/typedQuery.ts` (typed query helpers)
- `src/components/providers/SystemProvider.tsx` (PowerSync DB + Kysely wiring)
