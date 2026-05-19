import type { WebRole } from "./logic/determineAccess";

type RoleConfig = {
  allowedPaths: string[];
  showSidebar: boolean;
};

export type MergedAccessConfig = {
  allowedPaths: string[];
  defaultRedirect: string;
  showSidebar: boolean;
};

const ROLE_CONFIG: Record<WebRole, RoleConfig> = {
  admin: {
    allowedPaths: [
      "/dashboard",
      "/quotes-bookings",
      "/team",
      "/assets",
      "/damage-reports",
      "/inspections",
      "/repairs",
      "/work-trackers",
      "/scorecard",
      "/driver-scorecard",
      "/leaderboard",
      "/driver-calendar",
      "/zones",
      "/inspection-questions",
      "/quickbooks",
      "/event-dashboard",
      "/roadmap",
    ],
    showSidebar: true,
  },
  account_manager: {
    allowedPaths: [
      "/dashboard",
      "/quotes-bookings",
      "/assets",
      "/damage-reports",
      "/inspections",
      "/repairs",
      "/work-trackers",
      "/scorecard",
      "/driver-scorecard",
      "/leaderboard",
      "/driver-calendar",
      "/zones",
      "/quickbooks",
      "/event-dashboard",
      "/roadmap",
    ],
    showSidebar: true,
  },
  developer: {
    allowedPaths: ["/roadmap"],
    showSidebar: true,
  },
  viewer: {
    allowedPaths: [
      "/dashboard",
      "/quotes-bookings",
      "/assets",
      "/damage-reports",
      "/inspections",
      "/repairs",
      "/work-trackers",
      "/scorecard",
      "/driver-scorecard",
      "/leaderboard",
      "/driver-calendar",
    ],
    showSidebar: true,
  },
};

export function mergeRoleConfigs(roles: WebRole[]): MergedAccessConfig {
  const pathSet = new Set<string>();
  let showSidebar = false;

  for (const role of roles) {
    const config = ROLE_CONFIG[role];
    for (const path of config.allowedPaths) {
      pathSet.add(path);
    }
    if (config.showSidebar) showSidebar = true;
  }

  const allowedPaths = [...pathSet];
  const defaultRedirect = allowedPaths.includes("/dashboard")
    ? "/dashboard"
    : (allowedPaths[0] ?? "/");

  return { allowedPaths, defaultRedirect, showSidebar };
}
