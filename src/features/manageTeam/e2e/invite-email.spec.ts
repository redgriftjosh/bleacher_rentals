import { test, expect, type Page } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import { STATUSES } from "../constants";
import { makeGmailPlusAlias, waitForGmailMessage } from "./utils/gmail";
import { getSupabaseAdmin, isSupabaseE2EConfigured, waitForUserByEmail } from "./utils/supabaseAdmin";

function extractClerkInviteUrl(urls: string[]): string {
  const candidate = urls
    .map((u) => {
      try {
        const parsed = new URL(u);

        // Gmail UI often includes safe-redirect wrappers.
        if (parsed.hostname === "www.google.com" && parsed.pathname === "/url") {
          const q = parsed.searchParams.get("q");
          if (q) return q;
        }

        return u;
      } catch {
        return u;
      }
    })
    .find((u) => u.includes("clerk.accounts.dev/v1/tickets/accept?ticket="));

  if (!candidate) {
    throw new Error(`Could not find Clerk ticket accept URL in: ${urls.join("\n")}`);
  }

  return candidate;
}

async function completeClerkInviteAccept(params: {
  page: Page;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}) {
  const { page, email, firstName, lastName, password } = params;

  // Clerk flows vary: you may land on "Fill in missing fields" (signup) or "Sign in".
  // If we landed on Sign in, go to Sign up first.
  const signUpLink = page.getByRole("link", { name: /sign up/i });
  if (await signUpLink.count()) {
    // Only click it if we're on a sign-in screen.
    const signInHeading = page.getByRole("heading", { name: /sign in/i }).first();
    if (await signInHeading.count()) {
      await signUpLink.first().click();
    }
  }

  // Fill name fields if present.
  const firstNameInput = page.locator('input[placeholder="First name"], input[name="firstName"]');
  if (await firstNameInput.count()) {
    await firstNameInput.first().fill(firstName);
  }

  const lastNameInput = page.locator('input[placeholder="Last name"], input[name="lastName"]');
  if (await lastNameInput.count()) {
    await lastNameInput.first().fill(lastName);
  }

  // Fill email if present and empty.
  const emailInput = page.locator('input[type="email"], input[autocomplete="email"]');
  if (await emailInput.count()) {
    const current = await emailInput.first().inputValue().catch(() => "");
    if (!current) await emailInput.first().fill(email);
  }

  // Fill any password inputs that are present (some flows have one, some have two).
  const passwordInputs = page.locator('input[type="password"]');
  await expect(passwordInputs.first()).toBeVisible({ timeout: 60_000 });

  const pwCount = await passwordInputs.count();
  for (let i = 0; i < pwCount; i += 1) {
    await passwordInputs.nth(i).fill(password);
  }

  const continueButton = page.getByRole("button", { name: /continue|sign up|create|finish|accept/i }).first();
  await continueButton.click();
}

test.describe("Manage Team invites", () => {
  test("Invite email + accept link creates Clerk user", async ({ page, browser }) => {
    // This is a slow, real-email + Clerk-hosted page flow.
    test.setTimeout(240_000);

    const gmailClientId = process.env.E2E_GMAIL_CLIENT_ID;
    const gmailClientSecret = process.env.E2E_GMAIL_CLIENT_SECRET;
    const gmailRefreshToken = process.env.E2E_GMAIL_REFRESH_TOKEN;
    const gmailBaseInbox = process.env.E2E_GMAIL_INBOX;

    const invitedPassword = process.env.E2E_INVITED_USER_PASSWORD ?? "TestingInvitations@1";

    test.skip(
      !gmailClientId || !gmailClientSecret || !gmailRefreshToken || !gmailBaseInbox,
      "Missing E2E env vars: E2E_GMAIL_CLIENT_ID, E2E_GMAIL_CLIENT_SECRET, E2E_GMAIL_REFRESH_TOKEN, E2E_GMAIL_INBOX"
    );

    test.skip(!isSupabaseE2EConfigured(), "Supabase admin env vars not set");

    const supabase = getSupabaseAdmin();

    const sentAt = new Date();
    const inviteEmail = makeGmailPlusAlias(gmailBaseInbox!);

    // 1) Create invited user (DB row created by app, invitation created by Clerk)
    await page.goto("/team");
    await page.getByRole("button", { name: "+ Add Team Member" }).click();

    await page.locator("#firstName").fill("E2E");
    await page.locator("#lastName").fill("Invite");
    await page.locator("#email").fill(inviteEmail);
    await page.locator("#isAdmin").check();

    await page.getByRole("button", { name: "Send Invite" }).click();

    // 2) Verify the Users row exists BEFORE sign-out
    const invitedUser = await waitForUserByEmail({ supabase, email: inviteEmail, timeoutMs: 60_000 });
    expect(invitedUser.first_name).toBe("E2E");
    expect(invitedUser.last_name).toBe("Invite");
    expect(invitedUser.email).toBe(inviteEmail.toLowerCase());
    expect(invitedUser.clerk_user_id).toBeNull();
    expect(invitedUser.is_admin).toBe(true);
    expect(invitedUser.status_uuid).toBe(STATUSES.invited);

    // 3) Wait for the invitation email and extract the Clerk accept URL
    const message = await waitForGmailMessage({
      clientId: gmailClientId!,
      clientSecret: gmailClientSecret!,
      refreshToken: gmailRefreshToken!,
      toEmail: inviteEmail,
      receivedAfter: sentAt,
      timeoutMs: 120_000,
    });

    expect(message.to.toLowerCase()).toContain(inviteEmail.toLowerCase());
    expect(message.subject).toMatch(/invitation|invite/i);

    const inviteUrl = extractClerkInviteUrl(message.urls);

    // 4) Sign out the inviter (admin)
    await clerk.signOut({ page });

    // 5) Open the invite link as a fresh, logged-out browser context
    const invitedContext = await browser.newContext();
    const invitedPage = await invitedContext.newPage();

    await invitedPage.goto(inviteUrl, { waitUntil: "domcontentloaded" });

    // 6) Complete account creation / acceptance flow on Clerk
    await completeClerkInviteAccept({
      page: invitedPage,
      email: inviteEmail,
      firstName: "E2E",
      lastName: "Invite",
      password: invitedPassword,
    });

    // Wait until we leave the ticket accept page (or end up back on the app)
    await invitedPage.waitForURL((url) => !url.toString().includes("/tickets/accept"), {
      timeout: 120_000,
    });

    // 7) Verify Supabase now has a Clerk user id for this email (via webhook)
    const deadline = Date.now() + 180_000;
    let updated = invitedUser;

    while (Date.now() < deadline) {
      updated = await waitForUserByEmail({ supabase, email: inviteEmail, timeoutMs: 10_000 });
      if (updated.clerk_user_id) break;
      await new Promise((r) => setTimeout(r, 1_000));
    }

    expect(updated.clerk_user_id).not.toBeNull();

    await invitedContext.close();
  });
});
