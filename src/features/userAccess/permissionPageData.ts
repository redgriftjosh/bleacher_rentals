import type { WebRole } from "./logic/determineAccess";

export type PermissionLevel = "full" | "read" | "custom" | "none";

export type PermissionAccess = {
  level: PermissionLevel;
  note?: string;
};

export type PermissionEntry = {
  label: string;
  category: string;
  roles: Record<WebRole, PermissionAccess>;
};

export const ROLE_LABELS: Record<WebRole, string> = {
  admin: "Administrator",
  account_manager: "Account Manager",
  developer: "Developer",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<WebRole, string> = {
  admin: "Full access to all features, settings, and team management.",
  account_manager:
    "Manages their own assigned bleachers, drivers, and events. Cannot delete or modify company-wide data, other managers' records, or anything outside their own scope. A low-risk role to add without worrying about unintended changes to shared data.",
  developer: "Access to the product roadmap only.",
  viewer: "Read-only access to operational data. Cannot create, edit, or delete anything.",
};

export const ROLE_ORDER: WebRole[] = ["admin", "account_manager", "developer", "viewer"];

export const DEFAULT_NOTES: Record<PermissionLevel, string> = {
  full: "This role has full access — they can view, create, edit, and delete records.",
  read: "This role has read-only access — they can view data but cannot make any changes.",
  custom: "This role has custom access — see details below.",
  none: "This role has no access — the page or data is completely hidden from them.",
};

const full = (note?: string): PermissionAccess => ({ level: "full", note });
const read = (note?: string): PermissionAccess => ({ level: "read", note });
const custom = (note: string): PermissionAccess => ({ level: "custom", note });
const none = (note?: string): PermissionAccess => ({ level: "none", note });

export const PERMISSIONS: PermissionEntry[] = [
  // Features
  {
    label: "Events",
    category: "Features",
    roles: {
      admin: full(
        "should be able to create, update, delete, and edit any events, regardless of who event is assigned to",
      ),
      account_manager: custom(
        "Account managers can freely create events, but can only edit or delete events that were created by themselves. They are able to view All events regarless of the event owner.",
      ),
      developer: none(
        "Unable to even access the pages where they can see events, and developer is only meant to work on the developer roadmap.",
      ),
      viewer: read(
        "This user will be able to see all the event and every detail but not able to create, edit, or delete any events.",
      ),
    },
  },
];

export const CATEGORIES = [...new Set(PERMISSIONS.map((p) => p.category))];
