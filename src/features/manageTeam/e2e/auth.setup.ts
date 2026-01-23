import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

setup.describe.configure({ mode: "serial" });

const authFile = path.join(process.cwd(), "playwright/.auth/user.json");

setup("clerk setup", async () => {
  // Clerk's testing helpers look for CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY.
  // Your Next.js app typically uses NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.
  if (!process.env.CLERK_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    process.env.CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  }

  if (!process.env.CLERK_PUBLISHABLE_KEY) {
    throw new Error(
      "Missing CLERK_PUBLISHABLE_KEY (or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) for Clerk Playwright testing"
    );
  }

  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("Missing CLERK_SECRET_KEY for Clerk Playwright testing");
  }

  if (!process.env.E2E_CLERK_EMAIL || !process.env.E2E_CLERK_PASSWORD) {
    throw new Error("Missing E2E_CLERK_EMAIL and/or E2E_CLERK_PASSWORD");
  }

  await clerkSetup();
});

setup("authenticate", async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  await page.goto("/");

  // This avoids external OAuth (Apple) and bot detection.
  // Requires Clerk username/password auth enabled + a test user.
  await clerk.signIn({
    page,
    signInParams: {
      strategy: "password",
      identifier: process.env.E2E_CLERK_EMAIL!,
      password: process.env.E2E_CLERK_PASSWORD!,
    },
  });

  await page.context().storageState({ path: authFile });
});
