# Bleacher Rentals Admin App - Copilot Instructions

## Architecture Overview

This is a **Next.js 15** app with **App Router** using TypeScript. It's an internal admin tool for managing bleacher rental logistics with complex scheduling and resource management.

### Core Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS 4
- **UI Components**: shadcn/ui (New York style) + custom components
- **State Management**: Zustand stores with stale-refresh pattern
- **Database**: Supabase with real-time subscriptions via Pusher
- **Auth**: Clerk with custom user management
- **Canvas/Graphics**: PixiJS for complex dashboard visualizations
- **Styling**: Tailwind CSS with shadcn/ui + custom color system

## Key Patterns & Conventions

### State Management - Zustand with Stale Pattern

Every Zustand store follows this exact pattern:

```typescript
type Store = {
  data: Tables<"TableName">[];
  stale: boolean;
  setData: (data: Tables<"TableName">[]) => void;
  setStale: (stale: boolean) => void;
};
```

**Critical**: All stores include `stale` tracking for intelligent refetching. Use `useSetupTable` hook for automatic data management.

### Data Flow Architecture

1. **useSupabaseSubscriptions()** - Central hook that sets up all table subscriptions
2. **useSetupTable()** - Generic hook for table setup with stale refresh
3. **Pusher** - Real-time updates trigger `setStaleByTable()` from `zustandRegistry.ts`
4. **Server Actions** - Use `updateDataBase()` action to trigger Pusher notifications

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

- **`src/state/`** - All Zustand stores (one per database table)
- **`src/hooks/`** - Reusable hooks, especially data fetching patterns
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

1. Add migration to `supabase/migrations/`
2. Run `npm run generate-types-local`
3. Create Zustand store in `src/state/`
4. Add to `zustandRegistry.ts`
5. Add to `useSupabaseSubscriptions.ts`

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
