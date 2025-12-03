/**
 * Configuration for deprecated database tables and columns.
 * Add deprecated items here to automatically generate linting patterns.
 */

/**
 * @typedef {Object} DeprecatedTable
 * @property {string} name
 * @property {string} reason
 */

/**
 * @typedef {Object} DeprecatedColumn
 * @property {string} table
 * @property {string} column
 * @property {string} reason
 */

/**
 * @typedef {Object} DeprecatedConfig
 * @property {DeprecatedTable[]} tables
 * @property {DeprecatedColumn[]} columns
 */

// ============================================================================
// DEPRECATION CONFIGURATION
// ============================================================================
// Add deprecated tables and columns here with their replacement instructions

/** @type {DeprecatedConfig} */
export const DEPRECATED_CONFIG = {
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
