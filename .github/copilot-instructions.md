# Bleacher Rentals Admin App - Copilot Instructions

## Architecture Overview

This is a **Next.js 15** app with **App Router** using TypeScript. It's an internal admin tool for managing bleacher rental logistics with complex scheduling and resource management.

### Core Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS 4
- **UI Components**: shadcn/ui (New York style) + custom components
- **State Management**: Feature-specific Zustand stores (transitioning away from global src/state stores)
- **Database**: Supabase with real-time subscriptions via Pusher
- **Auth**: Clerk with custom user management
- **Canvas/Graphics**: PixiJS for complex dashboard visualizations
- **Styling**: Tailwind CSS with shadcn/ui + custom color system

## Key Patterns & Conventions

### State Management Migration Plan

**🚨 IMPORTANT: Active Migration in Progress**

We are **phasing out** all global Zustand stores in `src/state/` that mirror database tables. These stores were used for caching and real-time updates but add unnecessary complexity.

**Stores Being Deprecated (DO NOT use in new code):**

- `src/state/eventsStore.ts` → Use direct Supabase queries
- `src/state/bleacherEventStore.ts` → Use direct Supabase queries
- `src/state/addressesStore.ts` → Use direct Supabase queries
- `src/state/bleachersStore.ts` → Use direct Supabase queries
- `src/state/blocksStore.ts` → Use direct Supabase queries
- `src/state/workTrackersStore.ts` → Use direct Supabase queries
- All other `src/state/*Store.ts` files

**Stores That Are Good (continue using):**

- `src/features/eventConfiguration/state/useCurrentEventStore.ts` - Feature-specific form state
- `src/features/dashboardOptions/useFilterDashboardStore.ts` - Dashboard filter state
- Other feature-specific stores in `src/features/**/state/`

**Migration Pattern:**

```typescript
// ❌ OLD: Reading from global Zustand store
const events = useEventsStore((s) => s.events);
const bleacherEvents = useBleacherEventsStore((s) => s.bleacherEvents);

// ✅ NEW: Direct Supabase query with proper joins
const { data: eventData } = await supabase
  .from("Events")
  .select(
    `
    *,
    address:Addresses(*),
    bleacher_events:BleacherEvents(bleacher_id)
  `
  )
  .eq("event_id", eventId)
  .single();
```

**Why This Migration:**

- Removes duplicate state management layer
- Simplifies data flow (single source of truth: database)
- Eliminates stale data issues and complex refresh logic
- Reduces bundle size and complexity
- Pusher real-time updates will be handled differently

### Old State Management Pattern (Being Phased Out)

The legacy pattern used Zustand stores with stale-refresh:

```typescript
type Store = {
  data: Tables<"TableName">[];
  stale: boolean;
  setData: (data: Tables<"TableName">[]) => void;
  setStale: (stale: boolean) => void;
};
```

**Do not replicate this pattern.** Use direct Supabase queries instead.

### Data Flow Architecture (New Pattern)

1. **Direct Queries** - Fetch data directly from Supabase when needed
2. **Feature Stores** - Use Zustand only for UI/form state within features
3. **React Query** (future) - May be added for caching and optimistic updates
4. **Pusher** - Real-time updates will trigger component re-renders directly

### Database Integration

- **Type Safety**: Use generated `database.types.ts` (regenerate with npm scripts)
- **Client Access**: `getSupabaseClient(token)` for authenticated requests
- **Server Access**: `getSupabaseServer(token)` for API routes
- **Auth Pattern**: Always check Clerk auth, extract JWT token for Supabase RLS

### API Route Patterns

```typescript
export async function GET(req: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getToken({ template: "supabase" });
  const supabase = await getSupabaseServer(token);
  // ... rest of logic
}
```

### File Organization

- **`src/state/`** - ⚠️ **DEPRECATED** - Legacy global Zustand stores (being phased out)
- **`src/features/*/state/`** - ✅ Feature-specific Zustand stores (use these for UI/form state)
- **`src/hooks/`** - Reusable hooks (many will be deprecated with state migration)
- **`src/app/(dashboards)/`** - Route groups for dashboard pages
- **`src/features/`** - Complex feature modules (especially PixiJS dashboard)
- **`src/components/ui/`** - shadcn/ui components (don't modify directly)
- **`src/components/`** - Custom reusable components

### Component Patterns

- **Use shadcn/ui components** as foundation (Button, Dialog, DropdownMenu, etc.)
- **Custom components** extend shadcn patterns (see `PrimaryButton.tsx`)
- **Toast System**: Use `sonner` with custom `ErrorToast`/`SuccessToast` components
- **Form Validation**: Client-side validation functions in `_lib/functions.ts` files

### Development Workflow

- **Dev Server**: `npm run dev` (includes ngrok tunneling)
- **Type Generation**: `npm run generate-types-local` for Supabase types
- **"use client"** directive required for all Zustand stores and client components
- **Error Handling**: Use custom toast components, not generic notifications

### PixiJS Dashboard (Advanced Feature)

The `src/features/dashboard/` contains a complex PixiJS-based scheduling dashboard:

- **Grid System**: Custom scrollable grid with sticky headers
- **Baker Pattern**: Texture management and caching
- **Event Visualization**: Custom sprites for timeline events
- **Integration**: Connects to Zustand stores for real-time updates

### Business Logic Notes

- **User Roles**: Admin (2), Account Manager (1), Driver (3) - see `Constants.ts`
- **Event States**: "Quoted" vs "Booked" with different validation rules
- **Address Management**: Complex address linking system for events/work trackers
- **Work Tracking**: Driver-specific time tracking with tax calculations

## Common Tasks

### Adding New Database Table

**New Pattern (Recommended):**

1. Add migration to `supabase/migrations/`
2. Run `npm run generate-types-local`
3. Query directly from Supabase in components/features as needed
4. Use feature-specific Zustand stores only for UI state (not data caching)

**Old Pattern (Being Phased Out):**

1. ~~Add migration to `supabase/migrations/`~~
2. ~~Run `npm run generate-types-local`~~
3. ~~Create Zustand store in `src/state/`~~
4. ~~Add to `zustandRegistry.ts`~~
5. ~~Add to `useSupabaseSubscriptions.ts`~~

### Creating New Page

1. Use `src/app/(dashboards)/` for authenticated pages
2. Include `_lib/` folder for page-specific logic
3. Follow pattern: `page.tsx`, `_lib/db.ts`, `_lib/types.ts`, `_lib/functions.ts`

### Error Handling Best Practice

```typescript
try {
  // operation
  createSuccessToast("Success message");
} catch (error) {
  createErrorToast("Error occurred", error);
}
```

Always handle errors at the UI level with custom toast components for consistent UX.
