import crypto from "crypto";
import { getQboTokens, setQboTokens } from "./db";
import { oauthClient } from "./oauthClient";

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

export async function saveTokens(token: any) {
  const json = JSON.stringify(token);
  const encrypted = encrypt(json);
  await setQboTokens(encrypted);
}

export async function loadTokens() {
  const encrypted = await getQboTokens();
  console.log("encrypted: ", encrypted);
  const json = decrypt(encrypted ?? "");
  console.log("json: ", json);
  return JSON.parse(json);
}

export async function getQboAccessTokenAndRealmId(): Promise<{
  accessToken: string;
  realmId: string;
}> {
  // Refresh if needed
  if (!oauthClient.isAccessTokenValid()) {
    try {
      console.log("Refreshing tokens...");
      const prevTokens = await loadTokens();
      console.log("prevTokens: ", prevTokens);
      oauthClient.setToken(prevTokens);
      const refreshResponse = await oauthClient.refresh();
      console.log("refreshResponse.getJson(): ", refreshResponse.getJson());
      const tokens = {
        ...refreshResponse.getJson(),
        realmId: prevTokens?.realmId, // preserve existing
      };
      await saveTokens(tokens);
    } catch (e: any) {
      console.error("Failed to refresh tokens:", e.originalMessage || e.message);
      throw e;
    }
  }
  const token = oauthClient.getToken();
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
