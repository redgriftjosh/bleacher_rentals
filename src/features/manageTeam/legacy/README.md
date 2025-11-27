# Legacy Code

This folder contains legacy code from `src/app/team/_lib/` that has been replaced by the new manageTeam feature architecture.

## Migration Status

### ✅ Migrated & Replaced

- **fetchUsers()** → Moved to `src/features/manageTeam/util/fetchUsers.ts`
- **User CRUD operations** → Rebuilt in `src/features/manageTeam/db/userOperations.ts` with cleaner API
- **User queries** → New in `src/features/manageTeam/db/userQueries.ts`
- **Form validation** → Rebuilt in `src/features/manageTeam/util/validation.ts`
- **Components** → Rebuilt in `src/features/manageTeam/components/`

### 📦 Legacy (Not Migrated)

- **constants.ts** - Role and status constants (kept for reference)
- **legacyDb.ts** - Old database operations (kept for reference, may have useful patterns)
- **SheetAddTeamMember.tsx** (in `src/app/team/_lib/components/`) - Old sheet-style modal, replaced by new modal
- **PaymentInfo.tsx** (in `src/app/team/_lib/components/`) - Old payment input component

## New Architecture

The new manageTeam feature uses:

- **Zustand** for centralized state management
- **Testable utilities** separated from components
- **Modern modal UI** with sections instead of tabs
- **Accordion-style role toggles** for better UX
- **Reusable input components** for consistency

## Safe to Delete

Once you've verified everything works, you can safely delete:

- `src/app/team/_lib/` (entire directory)
- `src/features/manageTeam/legacy/` (this directory)
