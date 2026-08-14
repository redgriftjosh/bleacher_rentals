import { describe, it, expect } from "vitest";
import { parseLoomEmbedUrl } from "./loomEmbed";

const ID = "7decda7d37d14124b8fac9b17659b7dc";

describe("parseLoomEmbedUrl", () => {
  it("turns a share link into an embed link", () => {
    expect(parseLoomEmbedUrl(`https://www.loom.com/share/${ID}`)).toBe(
      `https://www.loom.com/embed/${ID}`,
    );
  });

  it("accepts an embed link already", () => {
    expect(parseLoomEmbedUrl(`https://www.loom.com/embed/${ID}`)).toBe(
      `https://www.loom.com/embed/${ID}`,
    );
  });

  it("accepts the bare host", () => {
    expect(parseLoomEmbedUrl(`https://loom.com/share/${ID}`)).toBe(
      `https://www.loom.com/embed/${ID}`,
    );
  });

  it("drops the query string, which can carry a viewer session id", () => {
    expect(parseLoomEmbedUrl(`https://www.loom.com/share/${ID}?sid=abc-123&t=90`)).toBe(
      `https://www.loom.com/embed/${ID}`,
    );
  });

  it("ignores links that are not loom videos", () => {
    expect(parseLoomEmbedUrl("https://www.loom.com/looks/videos")).toBeNull();
    expect(parseLoomEmbedUrl("https://www.loom.com/share")).toBeNull();
    expect(parseLoomEmbedUrl(`https://www.loom.com/share/${ID}/extra`)).toBeNull();
  });

  it("ignores other hosts, including look-alikes", () => {
    expect(parseLoomEmbedUrl(`https://loom.com.evil.test/share/${ID}`)).toBeNull();
    expect(parseLoomEmbedUrl(`https://notloom.com/share/${ID}`)).toBeNull();
    expect(parseLoomEmbedUrl("https://example.com/video")).toBeNull();
  });

  it("ignores anything that is not https", () => {
    expect(parseLoomEmbedUrl(`http://www.loom.com/share/${ID}`)).toBeNull();
    expect(parseLoomEmbedUrl(`javascript:alert(1)//loom.com/share/${ID}`)).toBeNull();
    expect(parseLoomEmbedUrl("/relative/link")).toBeNull();
  });
});
