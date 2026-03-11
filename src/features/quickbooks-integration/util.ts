import crypto from "crypto";
import { getQboTokens, setQboTokens } from "./db";
import OAuthClient from "intuit-oauth-ts";

const ENCRYPTION_KEY = process.env.QBO_TOKEN_ENCRYPTION_KEY!; // Generate random 32-byte key and set as env variable, e.g. in terminal run node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
const IV_LENGTH = 16; // AES block size

function encrypt(text: string): string {
  console.log("ENCRYPTION_KEY", ENCRYPTION_KEY);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY, "base64"), iv);
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  return iv.toString("base64") + ":" + encrypted;
}

function decrypt(data: string): string {
  const [ivBase64, encrypted] = data.split(":");
  const iv = Buffer.from(ivBase64, "base64");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "base64"),
    iv,
  );
  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export async function saveTokens(connectionId: string, token: any) {
  const json = JSON.stringify(token);
  const encrypted = encrypt(json);
  await setQboTokens(connectionId, encrypted);
}

export async function loadTokens(connectionId: string) {
  const encrypted = await getQboTokens(connectionId);
  console.log("encrypted: ", encrypted);
  if (!encrypted || encrypted === "__pending__") return null;
  const json = decrypt(encrypted);
  console.log("json: ", json);
  return JSON.parse(json);
}

/**
 * Creates a fresh OAuthClient instance (not a singleton—each connection may have different tokens).
 */
export function createOAuthClient(): OAuthClient {
  return new OAuthClient({
    clientId: process.env.QBO_CLIENT_ID!,
    clientSecret: process.env.QBO_CLIENT_SECRET!,
    environment: process.env.QBO_ENVIRONMENT as "sandbox" | "production",
    redirectUri: process.env.QBO_REDIRECT_URI!,
  });
}

export async function getQboAccessTokenAndRealmId(connectionId: string): Promise<{
  accessToken: string;
  realmId: string;
}> {
  const client = createOAuthClient();

  const prevTokens = await loadTokens(connectionId);
  if (!prevTokens) throw new Error("No tokens found for this QBO connection");

  client.setToken(prevTokens);

  // Refresh if needed
  if (!client.isAccessTokenValid()) {
    try {
      console.log("Refreshing tokens for connection:", connectionId);
      const refreshResponse = await client.refresh();
      console.log("refreshResponse.getJson(): ", refreshResponse.getJson());
      const tokens = {
        ...refreshResponse.getJson(),
        realmId: prevTokens?.realmId, // preserve existing
      };
      await saveTokens(connectionId, tokens);
      client.setToken(tokens as any);
    } catch (e: any) {
      console.error("Failed to refresh tokens:", e.originalMessage || e.message);
      throw e;
    }
  }

  const token = client.getToken();
  const accessToken = token.access_token;
  const realmId = token.realmId;
  if (!accessToken || !realmId) throw new Error("Missing accessToken or realmId");
  return { accessToken, realmId };
}

export function getBaseUrl() {
  if (process.env.QBO_ENVIRONMENT === "sandbox") {
    return "https://sandbox-quickbooks.api.intuit.com/v3/company";
  } else {
    return "https://quickbooks.api.intuit.com/v3/company";
  }
}
