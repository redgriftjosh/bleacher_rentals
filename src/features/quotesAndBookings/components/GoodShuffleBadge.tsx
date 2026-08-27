"use client";

import Image from "next/image";

/**
 * Marks a row whose event is in GoodShuffle. Deliberately not a link: the table
 * row already navigates to the quote, and a nested link inside it would swallow
 * that click. The dashboard grid is where the logo opens GoodShuffle itself.
 */
export function GoodShuffleBadge() {
  return (
    <Image
      src="/GSLogo.png"
      alt="In GoodShuffle"
      title="In GoodShuffle"
      width={14}
      height={14}
      className="inline-block shrink-0 align-[-2px]"
    />
  );
}
