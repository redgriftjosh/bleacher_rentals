type GmailMessageListResponse = {
  messages?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
};

type GmailMessage = {
  id: string;
  snippet?: string;
  payload?: {
    mimeType?: string;
    body?: { data?: string };
    headers?: Array<{ name: string; value: string }>;
    parts?: Array<{
      mimeType?: string;
      body?: { data?: string };
      parts?: any[];
    }>;
  };
};

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

async function getGmailAccessToken(params: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<string> {
  const { clientId, clientSecret, refreshToken } = params;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to refresh Gmail token: ${res.status} ${body}`);
  }

  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("No access_token returned from Gmail token endpoint");
  return json.access_token;
}

function getHeader(message: GmailMessage, headerName: string): string | undefined {
  const headers = message.payload?.headers ?? [];
  const match = headers.find((h) => h.name.toLowerCase() === headerName.toLowerCase());
  return match?.value;
}

function collectBodyDataParts(message: GmailMessage): string[] {
  const out: string[] = [];

  const visit = (part: any) => {
    const data: string | undefined = part?.body?.data;
    const mimeType: string | undefined = part?.mimeType;

    if (data && (mimeType?.includes("text/plain") || mimeType?.includes("text/html"))) {
      out.push(base64UrlDecode(data));
    }

    const parts: any[] | undefined = part?.parts;
    if (Array.isArray(parts)) {
      for (const p of parts) visit(p);
    }
  };

  if (message.payload) visit(message.payload);
  return out;
}

function extractUrls(text: string): string[] {
  // Simple URL matcher: good enough for invite links.
  const matches = text.match(/https:\/\/[^\s"'<>]+/g);
  return matches ? Array.from(new Set(matches)) : [];
}

export function makeGmailPlusAlias(baseEmail: string, prefix = "e2e"): string {
  const [local, domain] = baseEmail.split("@");
  if (!local || !domain) {
    throw new Error(`Invalid base gmail address: ${baseEmail}`);
  }

  const uniq = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${local}+${prefix}-${uniq}@${domain}`;
}

export async function waitForGmailMessage(params: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  toEmail: string;
  receivedAfter: Date;
  timeoutMs?: number;
  pollIntervalMs?: number;
}): Promise<{ subject: string; to: string; urls: string[] }> {
  const {
    clientId,
    clientSecret,
    refreshToken,
    toEmail,
    receivedAfter,
    timeoutMs = 90_000,
    pollIntervalMs = 2_000,
  } = params;

  // Gmail search syntax is the same as Gmail UI.
  // `after:` is not consistently supported as epoch seconds, so use `newer_than` and filter.
  const q = `to:${toEmail} newer_than:2d`;

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const accessToken = await getGmailAccessToken({ clientId, clientSecret, refreshToken });

    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=5`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!listRes.ok) {
      const body = await listRes.text().catch(() => "");
      throw new Error(`Gmail list failed: ${listRes.status} ${body}`);
    }

    const listJson = (await listRes.json()) as GmailMessageListResponse;
    const firstId = listJson.messages?.[0]?.id;

    const messageIds = listJson.messages?.map((m) => m.id) ?? [];

    for (const id of messageIds) {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=full`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!msgRes.ok) {
        const body = await msgRes.text().catch(() => "");
        throw new Error(`Gmail get failed: ${msgRes.status} ${body}`);
      }

      const message = (await msgRes.json()) as GmailMessage;

      const dateHeader = getHeader(message, "Date");
      const parsedDate = dateHeader ? new Date(dateHeader) : undefined;

      // If the Date header is missing/unparseable, treat it as a match.
      const isNewEnough =
        !parsedDate || Number.isNaN(parsedDate.getTime())
          ? true
          : parsedDate.getTime() >= receivedAfter.getTime();

      if (!isNewEnough) continue;

      const subject = getHeader(message, "Subject") ?? "";
      const to = getHeader(message, "To") ?? "";

      const bodies = collectBodyDataParts(message);
      const urls = extractUrls(bodies.join("\n\n"));

      return { subject, to, urls };
    }

    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  throw new Error(`Timed out waiting for Gmail message to ${toEmail}`);
}
