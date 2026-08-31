"use client";

import { Globe, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { QUOTE_LANGUAGE_OPTIONS, type QuoteLanguage } from "./quoteLanguage";
import { quoteText } from "./quoteStrings";

/**
 * Language picker in the public quote header, so a client can correct the
 * language when the account manager set the wrong one on their contact record.
 *
 * Deliberately a single neutral globe icon rather than a visible "EN | FR"
 * switch: a permanent English/French pair reads as a Canadian-market product to
 * US clients. The icon says nothing about which languages exist until asked,
 * and it costs no extra room when a third language is added.
 *
 * The menu labels are endonyms from QUOTE_LANGUAGE_OPTIONS; the accessible
 * names are copy and come from quoteStrings.
 */
export function QuoteLanguageToggle({
  language,
  onChange,
}: {
  language: QuoteLanguage;
  onChange: (next: QuoteLanguage) => void;
}) {
  const s = quoteText(language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={s.languageGroupLabel}
        title={s.languageGroupLabel}
        className="flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#405daa]/30"
      >
        <Globe className="h-4 w-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[9rem]">
        {QUOTE_LANGUAGE_OPTIONS.map((option) => {
          const isActive = option.value === language;
          return (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => onChange(option.value)}
              className="cursor-pointer justify-between"
            >
              <span className={isActive ? "font-semibold" : undefined}>{option.label}</span>
              {isActive && <Check className="h-3.5 w-3.5" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
