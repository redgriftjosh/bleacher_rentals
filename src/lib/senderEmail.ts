/**
 * Temporary: .com domain is not yet verified in Postmark,
 * so we swap to .app which is verified.
 * Remove this file once bleacherrentals.com DKIM is set up.
 */
export function toSenderEmail(managerEmail: string): string {
  return managerEmail.replace(/@bleacherrentals\.com$/, "@bleacherrentals.app");
}
