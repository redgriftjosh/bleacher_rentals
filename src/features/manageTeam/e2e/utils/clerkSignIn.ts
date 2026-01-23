import { expect, type Page } from "@playwright/test";

export async function signInViaClerkUI(page: Page, params: { email: string; password: string }) {
  const { email, password } = params;

  await page.goto("/");

  // If already signed in, the app generally redirects away from the SignIn component.
  // Be conservative: if we can see a password input, proceed with sign-in.

  const emailInput = page.locator(
    'input[name="identifier"], input[autocomplete="email"], input[type="email"]'
  );

  await expect(emailInput.first()).toBeVisible({ timeout: 30_000 });
  await emailInput.first().fill(email);

  const continueButton = page
    .getByRole("button", { name: /continue|sign in|next/i })
    .first();
  await continueButton.click();

  const passwordInput = page.locator('input[name="password"], input[type="password"]');
  await expect(passwordInput.first()).toBeVisible({ timeout: 30_000 });
  await passwordInput.first().fill(password);

  const signInButton = page
    .getByRole("button", { name: /sign in|continue|next/i })
    .first();
  await signInButton.click();

  // App redirects to /dashboard after sign-in.
  await page.waitForURL(/\/dashboard|\/team|\/$/, { timeout: 60_000 });
}
