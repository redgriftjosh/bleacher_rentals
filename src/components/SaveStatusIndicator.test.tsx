import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SaveStatusIndicator } from "./SaveStatusIndicator";
import type { SaveState } from "@/lib/autosave";

const render = (state: SaveState, onRetry?: () => void) =>
  renderToStaticMarkup(<SaveStatusIndicator state={state} onRetry={onRetry} />);

describe("SaveStatusIndicator", () => {
  it("announces itself to screen readers", () => {
    const html = render("saving");
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });

  it("shows a spinning indicator while saving", () => {
    const html = render("saving");
    expect(html).toContain("Saving");
    expect(html).toContain("animate-spin");
  });

  it("respects prefers-reduced-motion", () => {
    expect(render("saving")).toContain("motion-reduce:animate-none");
  });

  it("confirms the write is done", () => {
    const html = render("saved");
    expect(html).toContain("Saved");
    expect(html).not.toContain("animate-spin");
  });

  it("stays invisible but keeps its footprint when idle, so the footer never jumps", () => {
    const html = render("idle");
    expect(html).toContain("opacity-0");
    expect(html).toContain("min-w-");
  });

  it("offers a retry on failure", () => {
    const html = render("error", () => {});
    expect(html).toContain("Couldn");
    expect(html).toContain("Retry");
  });

  it("omits the retry affordance when no handler is supplied", () => {
    expect(render("error")).not.toContain("Retry");
  });
});
