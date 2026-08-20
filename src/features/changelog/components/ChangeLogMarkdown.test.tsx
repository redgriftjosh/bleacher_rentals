import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ChangeLogMarkdown } from "./ChangeLogMarkdown";

const render = (body: string) => renderToStaticMarkup(<ChangeLogMarkdown body={body} />);

describe("ChangeLogMarkdown", () => {
  it("renders headings", () => {
    const html = render("## Second release");
    expect(html).toContain("<h2>Second release</h2>");
  });

  it("renders bullet lists", () => {
    const html = render("- Bullet one\n- Bullet two");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>Bullet one</li>");
    expect(html).toContain("<li>Bullet two</li>");
  });

  it("renders GFM tables (remark-gfm is wired up)", () => {
    const html = render("| Env | Status |\n| --- | --- |\n| dev | live |");
    expect(html).toContain("<table>");
    expect(html).toContain("<td>dev</td>");
  });

  it("preserves emoji", () => {
    expect(render("## Shipped 🎉")).toContain("🎉");
  });

  it("does not leave raw markdown syntax in the output", () => {
    const html = render("## Heading\n\n- Item");
    expect(html).not.toContain("## Heading");
    expect(html).not.toContain("- Item");
  });

  // The security property from the spec: rehype-raw is deliberately NOT enabled,
  // so anything HTML-shaped in a changelog body renders as inert escaped text.
  it("escapes raw HTML instead of executing it", () => {
    const html = render('<img src=x onerror="alert(1)">');

    // No live element and no live attribute: the handler survives only as
    // escaped text (&quot;), which the browser never executes.
    expect(html).not.toContain("<img");
    expect(html).not.toContain('onerror="alert(1)"');
    expect(html).toContain("&lt;img");
    expect(html).toContain("&quot;alert(1)&quot;");
  });

  it("escapes script tags", () => {
    const html = render("<script>alert(1)</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("turns a Loom share link into an inline player", () => {
    const html = render(
      "[Walkthrough](https://www.loom.com/share/7decda7d37d14124b8fac9b17659b7dc)",
    );

    expect(html).toContain('src="https://www.loom.com/embed/7decda7d37d14124b8fac9b17659b7dc"');
    expect(html).toContain("<iframe");
    // Never an anchor to the share page as well as the player.
    expect(html).not.toContain("loom.com/share");
  });

  it("leaves other links as links", () => {
    const html = render("[Docs](https://example.com/docs)");
    expect(html).toContain('<a href="https://example.com/docs"');
    expect(html).not.toContain("<iframe");
  });

  it("renders markdown images", () => {
    const html = render("![Pay ranges](/changelog/pay-ranges.png)");
    expect(html).toContain('src="/changelog/pay-ranges.png"');
    expect(html).toContain('alt="Pay ranges"');
  });
});
