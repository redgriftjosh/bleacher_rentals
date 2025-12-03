/**
 * Configuration for deprecated database tables and columns.
 * Add deprecated items here to automatically generate linting patterns.
 */

export type DeprecatedTable = {
  name: string;
  reason: string;
};

export type DeprecatedColumn = {
  table: string;
  column: string;
  reason: string;
};

export type DeprecatedConfig = {
  tables: DeprecatedTable[];
  columns: DeprecatedColumn[];
};

// ============================================================================
// DEPRECATION CONFIGURATION
// ============================================================================
// Add deprecated tables and columns here with their replacement instructions

export const DEPRECATED_CONFIG: DeprecatedConfig = {
  tables: [
    {
      name: "UserRoles",
      reason: "Roles are now determined by is_admin flag and Drivers/AccountManagers tables.",
    },
  ],
  columns: [
    {
      table: "Users",
      column: "role",
      reason: "Use is_admin flag and check Drivers/AccountManagers tables instead.",
    },
    {
      table: "WorkTrackers",
      column: "user_id",
      reason: "Use driver_id instead (WorkTrackers now links to Drivers table).",
    },
  ],
};
