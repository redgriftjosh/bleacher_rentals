import { Graphics, Sprite, Text } from "pixi.js";
import { Baker } from "../../../util/Baker";
import { CELL_HEIGHT } from "../../../values/constants";
import type { BleacherWorkTracker } from "../../../types";
import { STATUS_TINT } from "./statusTint";
import { drawUnavailableOverlay } from "./unavailableOverlay";

/**
 * Small work tracker thumbnail (CELL_HEIGHT/2 square).
 * Shows driver initials only (12pt). Used when events overlap or >2 trackers.
 */
export class WorkTrackerSmall extends Sprite {
  constructor(baker: Baker, tracker: BleacherWorkTracker, isUnavailable: boolean = false, alertCount: number = 0) {
    super();

    const size = Math.floor(CELL_HEIGHT / 2);
    const bg = STATUS_TINT[tracker.status] ?? 0x808080;
    const initials = getInitials(tracker.driverFirstName, tracker.driverLastName);

    const cacheKey = `WTSmall:${tracker.status}:${initials}:${isUnavailable ? "U" : ""}:a${alertCount}`;

    this.texture = baker.getTexture(cacheKey, { width: size, height: size }, (c) => {
      // Background
      const fill = new Graphics().rect(0, 0, size, size).fill(bg);
      c.addChild(fill);

      // Border
      const border = new Graphics();
      border.rect(0.5, 0.5, size - 1, size - 1).stroke({ width: 1, color: 0x000000, alpha: 0.5 });
      c.addChild(border);

      // Initials
      if (initials) {
        const txt = new Text({
          text: initials,
          style: {
            fontSize: 12,
            fontWeight: "600",
            fill: 0x000000,
            fontFamily: "Helvetica",
            align: "center",
          },
        });
        txt.alpha = 0.6;
        txt.anchor.set(0.5, 0.5);
        txt.position.set(size / 2, size / 2);
        c.addChild(txt);
      }

      // Unavailable driver overlay
      if (isUnavailable) {
        drawUnavailableOverlay(c, size, size);
      }

      // Alert dot (top-right) — too small for a numbered badge
      if (alertCount > 0) {
        const dot = new Graphics();
        dot.circle(size - 5, 5, 4).fill(0xff0000);
        c.addChild(dot);
      }
    });
  }
}

function getInitials(first: string | null, last: string | null): string {
  const f = first?.charAt(0)?.toUpperCase() ?? "";
  const l = last?.charAt(0)?.toUpperCase() ?? "";
  return f + l;
}
