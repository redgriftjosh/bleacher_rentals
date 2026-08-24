"use client";

import type { QuoteLanguage } from "./quoteLanguage";
import { quoteText } from "./quoteStrings";

/**
 * EN | FR switch in the public quote header, so a client can correct the
 * language when the account manager set the wrong one on their contact record.
 *
 * The labels are ISO language codes, not copy — they read the same whichever
 * language is active, which is the point: a French speaker looking at an
 * English quote has to be able to find this. The accessible names ARE copy and
 * come from quoteStrings.
 */
export function QuoteLanguageToggle({
  language,
  onChange,
}: {
  language: QuoteLanguage;
  onChange: (next: QuoteLanguage) => void;
}) {
  const s = quoteText(language);
  const options: { value: QuoteLanguage; code: string; label: string }[] = [
    { value: "en", code: "EN", label: s.switchToEnglish },
    { value: "fr", code: "FR", label: s.switchToFrench },
  ];

  return (
    <div
      role="group"
      aria-label={s.languageGroupLabel}
      className="flex items-center rounded-md border border-gray-200 overflow-hidden shrink-0"
    >
      {options.map((option) => {
        const isActive = language === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-label={option.label}
            aria-pressed={isActive}
            className={`px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
              isActive
                ? "bg-[#405daa] text-white"
                : "bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            {option.code}
          </button>
        );
      })}
    </div>
  );
}
