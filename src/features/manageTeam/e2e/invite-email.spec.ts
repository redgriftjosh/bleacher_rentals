import { test, expect } from "@playwright/test";
import { makeGmailPlusAlias, waitForGmailMessage } from "./utils/gmail";

test.describe("Manage Team invites", () => {
  test("Send Invite delivers an email", async ({ page }) => {
    const gmailClientId = process.env.E2E_GMAIL_CLIENT_ID;
    const gmailClientSecret = process.env.E2E_GMAIL_CLIENT_SECRET;
    const gmailRefreshToken = process.env.E2E_GMAIL_REFRESH_TOKEN;
    const gmailBaseInbox = process.env.E2E_GMAIL_INBOX;

    test.skip(
      !gmailClientId || !gmailClientSecret || !gmailRefreshToken || !gmailBaseInbox,
      "Missing E2E env vars: E2E_GMAIL_CLIENT_ID, E2E_GMAIL_CLIENT_SECRET, E2E_GMAIL_REFRESH_TOKEN, E2E_GMAIL_INBOX",
    );

    const sentAt = new Date();
    const inviteEmail = makeGmailPlusAlias(gmailBaseInbox!);

    // Auth is handled by `src/features/manageTeam/e2e/auth.setup.ts` and loaded via storageState.
    await page.goto("/team");

    await page.getByRole("button", { name: "+ Add Team Member" }).click();

    await page.locator("#firstName").fill("E2E");
    await page.locator("#lastName").fill("Invite");
    await page.locator("#email").fill(inviteEmail);

    await page.getByRole("button", { name: "Send Invite" }).click();

    let message;
    try {
      message = await waitForGmailMessage({
        clientId: gmailClientId!,
        clientSecret: gmailClientSecret!,
        refreshToken: gmailRefreshToken!,
        toEmail: inviteEmail,
        receivedAfter: sentAt,
        timeoutMs: 120_000,
      });
    } catch (err) {
      const msg = String(err);
      test.skip(
        msg.includes("invalid_grant"),
        "Gmail refresh token invalid — renew E2E_GMAIL_REFRESH_TOKEN in .env.local",
      );
      throw err;
    }

    expect(message.to.toLowerCase()).toContain(inviteEmail.toLowerCase());
    expect(message.subject).toMatch(/invitation|invite/i);
  });
});
