import type { WebRole } from "./logic/determineAccess";

export type PermissionLevel = "full" | "read" | "custom" | "none";

export type PermissionAccess = {
  level: PermissionLevel;
  note?: string;
};

export type PermissionEntry = {
  label: string;
  description?: string;
  category: string;
  roles: Record<WebRole, PermissionAccess>;
};

export const ROLE_LABELS: Record<WebRole, string> = {
  admin: "Administrator",
  account_manager: "Account Manager",
  driver: "Driver",
  viewer: "Viewer",
  developer: "Developer",
};

export const ROLE_DESCRIPTIONS: Record<WebRole, string> = {
  admin: "Full access to all features, settings, and team management.",
  account_manager:
    "Manages their own assigned bleachers, drivers, and events. Cannot delete or modify company-wide data, other managers' records, or anything outside their own scope. A low-risk role to add without worrying about unintended changes to shared data.",
  developer: "Access to the product roadmap only.",
  viewer: "Read-only access to operational data. Cannot create, edit, or delete anything.",
  driver:
    "Access to the mobile driver app only. Cannot access the web dashboard at all, and has no permissions related to the web dashboard features.",
};

export const ROLE_ORDER: WebRole[] = ["admin", "account_manager", "driver", "viewer", "developer"];

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
  // Day to Day Operations
  {
    label: "Events",
    description: "This applies to the Dashboard and the Quotes & Bookings page.",
    category: "Day to Day Operations",
    roles: {
      admin: full(
        "should be able to create, update, delete, and edit any events, regardless of who event is assigned to. This includes the ability to reassign events between account managers.",
      ),
      account_manager: custom(
        "Account managers can freely create events, but can only edit or delete events that were created by themselves. They are able to view All events regardless of the event owner.",
      ),
      developer: none(
        "Unable to even access the pages where they can see events, and developer is only meant to work on the developer roadmap.",
      ),
      viewer: read(
        "This user will be able to see all the event and every detail but not able to create, edit, or delete any events.",
      ),
      driver: none("Drivers only have access to the Driver Mobile App."),
    },
  },
  {
    label: "Dashboard Cells",
    description: "This applies to the Dashboard page.",
    category: "Day to Day Operations",
    roles: {
      admin: full(
        "should be able to create, update, delete, and edit any cells, regardless of who is assigned to bleacher. ",
      ),
      account_manager: custom(
        "Account managers can freely create notes and events on cells, but can edit or delete only those cells that were created in the bleacher field assigned to them. They are able to view All cells regardless of the event owner.",
      ),
      developer: none(
        "Unable to even access the pages where they can see cells, and developer is only meant to work on the developer roadmap.",
      ),
      viewer: read(
        "This user will be able to see all the cells and every detail but not able to create, edit, or delete any cells.",
      ),
      driver: none("Drivers only have access to the Driver Mobile App."),
    },
  },
  {
    label: "Work Trackers",
    description: "This applies to the Work Trackers Page and the Dashboard.",
    category: "Day to Day Operations",
    roles: {
      admin: full(
        "should be able to create, update, delete, and edit any work trackers, regardless of who work tracker is assigned to. This includes the ability to reassign work trackers between drivers.",
      ),
      account_manager: custom(
        "Account managers can create work trackers, but can only assign work trackers to themselves. They can only modify or delete work trackers that are assigned to a driver that is assigned to themselves. They cannot create a work tracker for a driver that is not assigned to them.",
      ),
      developer: none(
        "Unable to even access the pages where they can see work trackers, and developer is only meant to work on the developer roadmap.",
      ),
      viewer: read(
        "This user will be able to see all the work trackers and every detail but not able to create, edit, or delete any work trackers.",
      ),
      driver: custom(
        "(in the mobile app only) Drivers only have access to work trackers that have been released and are assigned to them. They only have the ability to change the status and submit inspection forms to this work tracker. They cannot delete a work tracker or change any other information.",
      ),
    },
  },
  {
    label: "Mobile Driver App Access",
    description:
      "This only applies to being able to maintain data in the mobile app on the iOS and Android app store.",
    category: "Day to Day Operations",
    roles: {
      admin: none("Must be a driver to have access to the mobile app."),
      account_manager: none("Must be a driver to have access to the mobile app."),
      developer: none("Must be a driver to have access to the mobile app."),
      viewer: none("Must be a driver to have access to the mobile app."),
      driver: full(
        "Drivers have full access to their profile in the mobile app. They can update their driver information, vehicle information, and legal information. They can also set their availability and accept and complete work trackers.",
      ),
    },
  },
  {
    label: "Repairs & Maintenance",
    description:
      "Creating and managing maintenance events for taking bleachers in for repair or scheduled maintenance. This applies to the Repairs page and the Dashboard.",
    category: "Day to Day Operations",
    roles: {
      admin: full(
        "Can create, edit, and delete any repair or maintenance event regardless of who created it. Can reassign maintenance events between account managers.",
      ),
      account_manager: custom(
        "Can create new repair and maintenance events, but can only edit or delete ones they created themselves. Can view all maintenance events regardless of the creator.",
      ),
      developer: none(
        "Developers do not have access to repairs or maintenance data. This role is limited to the product roadmap.",
      ),
      viewer: read(
        "Can view all repair and maintenance events and their details but cannot create, edit, or delete any.",
      ),
      driver: none("Drivers only have access to the Driver Mobile App."),
    },
  },
  {
    label: "Damage Reports",
    description:
      "Reporting and tracking damage to bleachers. Damage reports can be created on the web dashboard or through the Driver Mobile App.",
    category: "Day to Day Operations",
    roles: {
      admin: full(
        "Can create, view, edit, and delete any damage report regardless of who created it.",
      ),
      account_manager: custom(
        "Can create new damage reports and view all existing ones. Can only edit or delete damage reports they created themselves.",
      ),
      developer: none(
        "Developers do not have access to damage report data. This role is limited to the product roadmap.",
      ),
      viewer: read(
        "Can view all damage reports and their details but cannot create, edit, or delete any.",
      ),
      driver: custom(
        "Can create damage reports through the mobile app when they notice damage to a bleacher. Can view their own submitted reports but cannot edit or delete them once submitted.",
      ),
    },
  },

  // Configuration
  {
    label: "Bleachers",
    description: "This applies to the Assets page.",
    category: "Configuration",
    roles: {
      admin: full("Able to create, update, delete, and edit all bleachers in the assets page."),
      account_manager: read(
        "Account managers should have view only access to the assets page and should not be able to make changes to the bleachers. they should not be able to create, delete or update. only read.",
      ),
      developer: none(
        "Unable to even access the pages where they can see bleachers, and developer is only meant to work on the developer roadmap.",
      ),
      viewer: read(
        "This user will be able to see all the bleachers and every detail but not able to create, edit, or delete any bleachers.",
      ),
      driver: none("Drivers only have access to the Driver Mobile App."),
    },
  },
  {
    label: "Quickbooks Connections",
    description: "This applies to the Quickbooks page.",
    category: "Configuration",
    roles: {
      admin: full(
        "Able to create, update, delete, and edit all Quickbooks connections in the Quickbooks page.",
      ),
      account_manager: none("Account managers can't even see this page even on sidebar"),
      developer: none(
        "Unable to even access the pages where they can see Quickbooks connections, and developer is only meant to work on the developer roadmap.",
      ),
      viewer: none("Viewers do not have access to the web configuration pages."),
      driver: none("Drivers only have access to the Driver Mobile App."),
    },
  },
  {
    label: "Manage Inspection Form",
    description:
      "The ability to create and edit the inspection form template that drivers fill out during pickup and drop-off. This applies to the Inspection Form page under Configuration.",
    category: "Configuration",
    roles: {
      admin: full(
        "Can create, reorder, edit, and delete inspection form questions. Full control over what drivers see when completing an inspection.",
      ),
      account_manager: none("Account managers can't even see this page even on sidebar"),
      developer: none(
        "Developers do not have access to the Inspection Form page. This role is limited to the product roadmap.",
      ),
      viewer: none("Viewers do not have access to the web configuration pages"),
      driver: none(
        "Drivers do not have access to the web configuration pages. They interact with the inspection form only when completing inspections in the mobile app.",
      ),
    },
  },
  {
    label: "Complete Inspections",
    description:
      "The ability to fill out and submit inspection forms when picking up or dropping off a bleacher. This happens in the Driver Mobile App.",
    category: "Day to Day Operations",
    roles: {
      admin: read(
        "Admins can view all completed inspections on the web dashboard but do not fill out inspections themselves.",
      ),
      account_manager: read(
        "Account managers can view completed inspections for drivers assigned to them but do not fill out inspections themselves.",
      ),
      developer: none(
        "Developers do not have access to inspection data. This role is limited to the product roadmap.",
      ),
      viewer: read(
        "Viewers can see all completed inspections and their details but cannot submit or modify them.",
      ),
      driver: custom(
        "Drivers submit inspections through the mobile app when picking up or dropping off a bleacher. They can only submit inspections for work trackers assigned to them. Once submitted, an inspection cannot be edited or deleted by the driver.",
      ),
    },
  },
  {
    label: "Zone Manager",
    category: "Configuration",
    roles: {
      admin: full("Able to create, update, delete, and edit all zones in the Zone Manager page."),
      account_manager: none("Account managers can't see zones page."),
      developer: none(
        "Unable to even access the pages where they can see zones, and developer is only meant to work on the developer roadmap.",
      ),
      viewer: none("Viewers do not have access to the web configuration pages."),
      driver: none("Drivers only have access to the Driver Mobile App."),
    },
  },

  // Team Management
  {
    label: "Invite Team Members",
    description: "The ability to add new users to the system. This applies to the Team page.",
    category: "Team Management",
    roles: {
      admin: full("Can invite any type of team member, including other admins."),
      account_manager: custom(
        "Can invite new team members, but cannot assign them the Admin role. Can only invite drivers and other standard roles.",
      ),
      developer: none(
        "Developers do not have access to the Team page. This role is limited to the product roadmap.",
      ),
      viewer: none(
        "Viewers cannot invite team members. They have read-only access across the platform.",
      ),
      driver: none("Drivers only have access to the Driver Mobile App."),
    },
  },
  {
    label: "Edit Team Members",
    description:
      "The ability to view and modify team member profiles, role assignments, and driver assignments. This applies to the Team page.",
    category: "Team Management",
    roles: {
      admin: full(
        "Can view and edit all information for every team member, including changing roles and reassigning drivers between managers.",
      ),
      account_manager: custom(
        "Can view every team member's profile, but can only edit driver data for drivers assigned to themselves. Can assign an unassigned driver to themselves, but cannot reassign a driver who is already assigned to another manager.",
      ),
      developer: none(
        "Developers do not have access to the Team page. This role is limited to the product roadmap.",
      ),
      viewer: read("Can view all team member profiles and details, but cannot make any changes."),
      driver: none("Drivers only have access to the Driver Mobile App."),
    },
  },
  {
    label: "Deactivate Team Members",
    description:
      "The ability to deactivate user accounts, removing their access to the system. This applies to the Team page.",
    category: "Team Management",
    roles: {
      admin: full(
        "Only admins can deactivate team members. This is an admin-exclusive action to prevent accidental loss of access.",
      ),
      account_manager: none(
        "Account managers cannot deactivate team members. Only admins have this ability.",
      ),
      developer: none(
        "Developers do not have access to the Team page. This role is limited to the product roadmap.",
      ),
      viewer: none(
        "Viewers cannot deactivate team members. They have read-only access across the platform.",
      ),
      driver: none("Drivers only have access to the Driver Mobile App."),
    },
  },

  // Scorecards
  {
    label: "Sales Scorecard",
    description:
      "View account manager performance numbers such as booked revenue, margins, and other sales metrics. This applies to the Sales Scorecard page.",
    category: "Scorecards",
    roles: {
      admin: full("Can view all account manager sales numbers and performance metrics."),
      account_manager: read(
        "Can view all account manager sales numbers, including their own and other managers' performance.",
      ),
      developer: none(
        "Developers do not have access to scorecard data. This role is limited to the product roadmap.",
      ),
      viewer: read("Can view all sales scorecard data but cannot make any changes."),
      driver: none("Drivers only have access to the Driver Mobile App."),
    },
  },
  {
    label: "Sales Scorecard Targets",
    description:
      "The ability to set and modify the performance targets for each account manager on the Sales Scorecard page.",
    category: "Scorecards",
    roles: {
      admin: full(
        "Only admins can create, edit, and delete scorecard targets for account managers.",
      ),
      account_manager: read(
        "Can view the targets set for them and other account managers, but cannot modify any targets.",
      ),
      developer: none(
        "Developers do not have access to scorecard data. This role is limited to the product roadmap.",
      ),
      viewer: read("Can view scorecard targets but cannot modify them."),
      driver: none("Drivers only have access to the Driver Mobile App."),
    },
  },
  {
    label: "Driver Scorecard",
    description:
      "View driver performance metrics such as on-time rates, inspection completion, and other driver stats. This applies to the Driver Scorecard page.",
    category: "Scorecards",
    roles: {
      admin: full("Can view all driver performance metrics and stats."),
      account_manager: read("Can view driver scorecard data for all drivers."),
      developer: none(
        "Developers do not have access to scorecard data. This role is limited to the product roadmap.",
      ),
      viewer: read("Can view all driver scorecard data but cannot make any changes."),
      driver: none("Drivers only have access to the Driver Mobile App."),
    },
  },

  // Development Roadmap
  {
    label: "Quarters",
    description:
      "Top-level time periods used to organize sprints and plan roadmap work. This applies to the Roadmap page.",
    category: "Development Roadmap",
    roles: {
      admin: full("Can create, edit, and delete quarters to structure the roadmap timeline."),
      account_manager: none("Account managers do not have access to roadmap planning."),
      developer: read(
        "Can view quarters to understand the roadmap timeline, but cannot create or modify them.",
      ),
      viewer: none("Viewers do not have access to the development roadmap."),
      driver: none("Drivers only have access to the Driver Mobile App."),
    },
  },
  {
    label: "Sprints",
    description:
      "Time-boxed development cycles within a quarter. Sprints contain tickets that developers work on. This applies to the Roadmap page.",
    category: "Development Roadmap",
    roles: {
      admin: full(
        "Can create, edit, and delete sprints. Full control over sprint planning and organization.",
      ),
      account_manager: none("Account managers do not have access to roadmap planning."),
      developer: read(
        "Can view sprints and the tickets within them, but cannot create, edit, or delete sprints themselves.",
      ),
      viewer: none("Viewers do not have access to the development roadmap."),
      driver: none("Drivers only have access to the Driver Mobile App."),
    },
  },
  {
    label: "Backlog / Tickets",
    description:
      "Individual work items that can live in the backlog or be assigned to a sprint. Tickets are visible on the Roadmap page and can be moved between the backlog and sprints.",
    category: "Development Roadmap",
    roles: {
      admin: full(
        "Can create, edit, and delete any ticket. Can move tickets between the backlog and sprints.",
      ),
      account_manager: full(
        "Can create, edit, and view tickets. Useful for submitting feature requests or bug reports directly into the backlog.",
      ),
      developer: full(
        "Can create, edit, and view tickets. Can move tickets between the backlog and sprints, and update ticket status as work progresses.",
      ),
      viewer: read(
        "Can view all tickets in the backlog and sprints but cannot create, edit, or move them.",
      ),
      driver: none("Drivers only have access to the Driver Mobile App."),
    },
  },
];

export const CATEGORIES = [...new Set(PERMISSIONS.map((p) => p.category))];
