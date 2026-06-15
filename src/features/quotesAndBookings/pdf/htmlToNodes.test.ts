import { describe, it, expect } from "vitest";
import {
  parseHtmlToNodes,
  parseInline,
  stripTags,
  decodeEntities,
} from "./htmlToNodes";

describe("decodeEntities", () => {
  it("decodes standard HTML entities", () => {
    expect(decodeEntities("&amp; &lt; &gt; &quot; &#39;")).toBe('& < > " \'');
  });

  it("decodes dash entities", () => {
    expect(decodeEntities("&ndash; &mdash;")).toBe("– —");
  });

  it("returns plain text unchanged", () => {
    expect(decodeEntities("hello world")).toBe("hello world");
  });
});

describe("stripTags", () => {
  it("removes HTML tags and decodes entities", () => {
    expect(stripTags("<strong>bold &amp; italic</strong>")).toBe("bold & italic");
  });

  it("handles nested tags", () => {
    expect(stripTags("<em><strong>nested</strong></em>")).toBe("nested");
  });
});

describe("parseInline", () => {
  it("parses plain text", () => {
    expect(parseInline("hello")).toEqual([{ type: "text", text: "hello" }]);
  });

  it("parses strong tags", () => {
    expect(parseInline("<strong>bold</strong>")).toEqual([
      { type: "strong", text: "bold" },
    ]);
  });

  it("parses mixed content", () => {
    const result = parseInline("before <strong>bold</strong> after");
    expect(result).toEqual([
      { type: "text", text: "before" },
      { type: "strong", text: "bold" },
      { type: "text", text: "after" },
    ]);
  });

  it("parses br tags", () => {
    const result = parseInline("line1<br/>line2");
    expect(result).toEqual([
      { type: "text", text: "line1" },
      { type: "br" },
      { type: "text", text: "line2" },
    ]);
  });

  it("decodes entities inside strong", () => {
    expect(parseInline("<strong>A &amp; B</strong>")).toEqual([
      { type: "strong", text: "A & B" },
    ]);
  });

  it("skips empty text nodes", () => {
    expect(parseInline("  ")).toEqual([]);
  });
});

describe("parseHtmlToNodes", () => {
  it("parses h1 tags", () => {
    const nodes = parseHtmlToNodes("<h1>Title</h1>");
    expect(nodes).toEqual([{ type: "h1", text: "Title" }]);
  });

  it("parses h2 tags", () => {
    const nodes = parseHtmlToNodes("<h2>Section</h2>");
    expect(nodes).toEqual([{ type: "h2", text: "Section" }]);
  });

  it("parses p tags with inline children", () => {
    const nodes = parseHtmlToNodes("<p>Some <strong>bold</strong> text</p>");
    expect(nodes).toEqual([
      {
        type: "p",
        children: [
          { type: "text", text: "Some" },
          { type: "strong", text: "bold" },
          { type: "text", text: "text" },
        ],
      },
    ]);
  });

  it("parses standalone br tags", () => {
    const nodes = parseHtmlToNodes("<br/>");
    expect(nodes).toEqual([{ type: "br" }]);
  });

  it("strips inner tags from h1/h2", () => {
    const nodes = parseHtmlToNodes("<h1><strong>Bold Title</strong></h1>");
    expect(nodes).toEqual([{ type: "h1", text: "Bold Title" }]);
  });

  it("parses a full document", () => {
    const html =
      "<h1>Contract</h1><h2>Section 1</h2><p>Paragraph with <strong>emphasis</strong>.</p><br/><p>Another paragraph.</p>";
    const nodes = parseHtmlToNodes(html);
    expect(nodes).toHaveLength(5);
    expect(nodes[0]).toEqual({ type: "h1", text: "Contract" });
    expect(nodes[1]).toEqual({ type: "h2", text: "Section 1" });
    expect(nodes[2].type).toBe("p");
    expect(nodes[3]).toEqual({ type: "br" });
    expect(nodes[4].type).toBe("p");
  });

  it("returns empty array for empty string", () => {
    expect(parseHtmlToNodes("")).toEqual([]);
  });

  it("returns empty array for plain text without tags", () => {
    expect(parseHtmlToNodes("just text")).toEqual([]);
  });
});
