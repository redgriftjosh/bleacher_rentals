import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QuoteLanguageToggle } from "./QuoteLanguageToggle";
import { QUOTE_LANGUAGE_OPTIONS, type QuoteLanguage } from "./quoteLanguage";
import { quoteStrings } from "./quoteStrings";

const render = (language: QuoteLanguage) =>
  renderToStaticMarkup(<QuoteLanguageToggle language={language} onChange={() => {}} />);

describe("QuoteLanguageToggle trigger", () => {
  it("shows a neutral icon, naming no language on the page itself", () => {
    // A visible "EN | FR" pair reads as a Canadian-market product to US
    // clients. The trigger must not advertise which languages exist.
    for (const lang of ["en", "fr"] as const) {
      const html = render(lang);
      for (const option of QUOTE_LANGUAGE_OPTIONS) {
        expect(html).not.toContain(`>${option.label}<`);
      }
      expect(html).not.toContain(">EN<");
      expect(html).not.toContain(">FR<");
    }
  });

  it("still carries an accessible name, in the language on screen", () => {
    expect(render("en")).toContain(`aria-label="${quoteStrings.languageGroupLabel.en}"`);
    expect(render("fr")).toContain(`aria-label="${quoteStrings.languageGroupLabel.fr}"`);
  });
});

describe("QUOTE_LANGUAGE_OPTIONS", () => {
  it("offers every language the quote can render in", () => {
    expect(QUOTE_LANGUAGE_OPTIONS.map((o) => o.value)).toEqual(["en", "fr"]);
  });

  it("labels each language in itself, so the list needs no translating", () => {
    // Endonyms: a French speaker scanning an English page looks for "Français".
    expect(QUOTE_LANGUAGE_OPTIONS).toContainEqual({ value: "fr", label: "Français" });
    expect(QUOTE_LANGUAGE_OPTIONS).toContainEqual({ value: "en", label: "English" });
  });

  it("has no duplicate entries", () => {
    const values = QUOTE_LANGUAGE_OPTIONS.map((o) => o.value);
    expect(new Set(values).size).toBe(values.length);
  });
});
