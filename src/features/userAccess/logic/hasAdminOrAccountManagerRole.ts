import type { WebRole } from "./determineAccess";

/** Roles allowed to call quote tax / QBO read helpers used during quote creation. */
export function hasAdminOrAccountManagerRole(roles: WebRole[]): boolean {
  return roles.includes("admin") || roles.includes("account_manager");
}
