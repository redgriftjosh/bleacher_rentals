export const UNAUTHENTICATED_ROUTES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/create-account",
];
export const AUTHENTICATED_ROUTES = [
  "/bleachers-dashboard",
  "/events-dashboard",
  "/team",
  "/assets",
  "/assets/bleachers",
  "/assets/other-assets",
  "/assets/bleachers/edit",
  "/testing",
];

export const USER_ROLES = {
  ADMIN: 2,
  ACCOUNT_MANAGER: 1,
} as const;

export type UserRoleKey = keyof typeof USER_ROLES;
export type UserRoleValue = (typeof USER_ROLES)[UserRoleKey];

// How many rows are available for bleachers?
export const ROW_OPTIONS = [4, 7, 8, 9, 10, 15];

export const activityTypes = ["Transport", "Setup", "Teardown", "Clean", "Repair"] as const;
