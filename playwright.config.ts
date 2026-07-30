import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// Role-based projects. Each role authenticates in auth.setup.ts and stores its
// session in playwright/.auth/<role>.json. A role's specs live in files named
// *.<role>.spec.ts (e.g. dashboard.admin.spec.ts). Files without a role suffix
// run on the default `chromium` project (the original E2E_CLERK_* user).
const ROLES = ["admin", "am", "driver", "viewer"] as const;

const roleSpec = (role: string) => new RegExp(`\\.${role}\\.spec\\.ts$`);
const anyRoleSpec = new RegExp(`\\.(${ROLES.join("|")})\\.spec\\.ts$`);

export default defineConfig({
  testDir: "src/features/manageTeam/e2e",
  timeout: 240_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL,
    trace: "on-first-retry",
    video: process.env.CI ? "retain-on-failure" : "off",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      // Default user (E2E_CLERK_EMAIL). Runs every spec without a role suffix.
      name: "chromium",
      dependencies: ["setup"],
      testIgnore: anyRoleSpec,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/user.json",
      },
    },
    ...ROLES.map((role) => ({
      name: role,
      dependencies: ["setup"],
      testMatch: roleSpec(role),
      use: {
        ...devices["Desktop Chrome"],
        storageState: `playwright/.auth/${role}.json`,
      },
    })),
  ],

  webServer:
    process.env.E2E_START_WEB === "false"
      ? undefined
      : {
          command: "npm run dev:e2e",
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
});
