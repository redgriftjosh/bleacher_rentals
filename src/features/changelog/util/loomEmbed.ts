/**
 * Loom share links written in a changelog body are turned into an inline player.
 *
 * Only loom.com is recognised, and only the video id is carried over — never the
 * query string, which can hold a viewer's session id (`?sid=…`).
 */
const LOOM_HOST = /^(www\.)?loom\.com$/;
const LOOM_ID = /^[a-zA-Z0-9]{8,}$/;

export function parseLoomEmbedUrl(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || !LOOM_HOST.test(url.hostname)) return null;

  const [section, id, ...rest] = url.pathname.split("/").filter(Boolean);
  if (rest.length > 0) return null;
  if (section !== "share" && section !== "embed") return null;
  if (!id || !LOOM_ID.test(id)) return null;

  return `https://www.loom.com/embed/${id}`;
}
