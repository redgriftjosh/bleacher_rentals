"use client";

import Image from "next/image";
import { AppTooltip } from "@/components/AppTooltip";

/**
 * Marks a row whose event is in GoodShuffle.
 *
 * Deliberately not a link: the table row already navigates to the quote, and a
 * nested link inside it would swallow that click. The dashboard grid is where
 * the logo opens GoodShuffle itself.
 *
 * The tooltip says why the logo is there rather than just naming it — a bare
 * "GoodShuffle" would tell someone who has not met this feature nothing at all.
 */
export function GoodShuffleBadge() {
  return (
    <AppTooltip content="This event is linked to GoodShuffle">
      <span className="inline-flex shrink-0 cursor-default">
        <Image
          src="/GSLogo.png"
          alt="Linked to GoodShuffle"
          width={14}
          height={14}
          className="align-[-2px]"
        />
      </span>
    </AppTooltip>
  );
}
