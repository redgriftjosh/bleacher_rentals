export type HtmlNode =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "p"; children: InlineNode[] }
  | { type: "br" };

export type InlineNode =
  | { type: "text"; text: string }
  | { type: "strong"; text: string }
  | { type: "br" };

export function parseHtmlToNodes(html: string): HtmlNode[] {
  const nodes: HtmlNode[] = [];
  const blockRegex = /<(h1|h2|p)>([\s\S]*?)<\/\1>|<br\s*\/?>/gi;
  let match;

  while ((match = blockRegex.exec(html)) !== null) {
    if (!match[1]) {
      nodes.push({ type: "br" });
      continue;
    }

    const tag = match[1].toLowerCase() as "h1" | "h2" | "p";
    const content = match[2];

    if (tag === "h1" || tag === "h2") {
      nodes.push({ type: tag, text: stripTags(content) });
    } else {
      nodes.push({ type: "p", children: parseInline(content) });
    }
  }

  return nodes;
}

export function parseInline(html: string): InlineNode[] {
  const inlineNodes: InlineNode[] = [];
  const inlineRegex = /<strong>([\s\S]*?)<\/strong>|<br\s*\/?>|([^<]+)/gi;
  let m;

  while ((m = inlineRegex.exec(html)) !== null) {
    if (m[1] !== undefined) {
      inlineNodes.push({ type: "strong", text: decodeEntities(m[1]) });
    } else if (m[0].match(/^<br/i)) {
      inlineNodes.push({ type: "br" });
    } else if (m[2]) {
      const text = decodeEntities(m[2].trim());
      if (text) inlineNodes.push({ type: "text", text });
    }
  }

  return inlineNodes;
}

export function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ""));
}

export function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—");
}
