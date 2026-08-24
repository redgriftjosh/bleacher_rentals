import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QuoteLanguageToggle } from "./QuoteLanguageToggle";
import type { QuoteLanguage } from "./quoteLanguage";

const render = (language: QuoteLanguage) =>
  renderToStaticMarkup(<QuoteLanguageToggle language={language} onChange={() => {}} />);

describe("QuoteLanguageToggle", () => {
  it("shows both languages whichever one is active", () => {
    // A French speaker looking at an English quote has to be able to find this.
    for (const lang of ["en", "fr"] as const) {
      const html = render(lang);
      expect(html).toContain(">EN<");
      expect(html).toContain(">FR<");
    }
  });

  it("marks the active language as pressed", () => {
    expect(render("fr")).toMatch(/aria-label="[^"]*français[^"]*"[^>]*aria-pressed="true"/);
    expect(render("en")).toMatch(/aria-label="View this quote in English"[^>]*aria-pressed="true"/);
  });

  it("labels the buttons in the language currently on screen", () => {
    expect(render("en")).toContain("View this quote in French");
    expect(render("fr")).toContain("Voir ce devis en anglais");
  });
});
