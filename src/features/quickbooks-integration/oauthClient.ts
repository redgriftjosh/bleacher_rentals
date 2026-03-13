import OAuthClient from "intuit-oauth-ts";

export const oauthClient = new OAuthClient({
  clientId: process.env.QBO_CLIENT_ID!,
  clientSecret: process.env.QBO_CLIENT_SECRET!,
  environment: process.env.QBO_ENVIRONMENT as "sandbox" | "production",
  redirectUri: process.env.QBO_REDIRECT_URI!,
});
