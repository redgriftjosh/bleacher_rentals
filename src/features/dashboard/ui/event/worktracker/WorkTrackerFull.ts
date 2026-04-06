import { Graphics, Sprite, Text } from "pixi.js";
import { Baker } from "../../../util/Baker";
import { PngManager } from "../../../util/PngManager";
import { CELL_HEIGHT, CELL_WIDTH } from "../../../values/constants";
import type { BleacherWorkTracker } from "../../../types";
import { STATUS_TINT } from "./statusTint";
import { drawUnavailableOverlay } from "./unavailableOverlay";

/**
 * Full-cell work tracker display (1 tracker, no event overlap).
 * Shows truck icon (left) + driver name + pickup/dropoff times (right).
 * Uses bleed pattern: texture is CELL_WIDTH+2 × CELL_HEIGHT+2, positioned at (-1,-1).
 */
export class WorkTrackerFull extends Sprite {
  constructor(baker: Baker, tracker: BleacherWorkTracker, isUnavailable: boolean = false) {
    super();

    const W = CELL_WIDTH + 1;
    const H = CELL_HEIGHT + 1;
    const bg = STATUS_TINT[tracker.status] ?? 0x808080;

    const driverName = formatDriverName(tracker.driverFirstName, tracker.driverLastName);
    const pickup = tracker.pickupTime ?? "";
    const dropoff = tracker.dropoffTime ?? "";

    const cacheKey = `WTFull:${tracker.status}:${driverName}:${pickup}:${dropoff}:${isUnavailable ? "U" : ""}`;

    this.texture = baker.getTexture(cacheKey, { width: W, height: H }, (c) => {
      // Background fill
      const fill = new Graphics().rect(0, 0, W, H).fill(bg);
      c.addChild(fill);

      // Border
      const border = new Graphics();
      border.rect(0.5, 0.5, W - 1, H - 1).stroke({ width: 1, color: 0x000000, alpha: 0.5 });
      c.addChild(border);

      // Truck icon (left side)
      const truckTex = PngManager.getTexture("truck");
      if (truckTex) {
        const icon = new Sprite(truckTex);
        const iconSize = 18;
        icon.width = iconSize;
        icon.height = iconSize;
        icon.position.set(2, (H - iconSize) / 2);
        icon.alpha = 0.5;
        icon.tint = 0x000000;
        c.addChild(icon);
      }

      // Text column (right of icon)
      const textX = 22;

      // Driver name
      if (driverName) {
        const nameTxt = new Text({
          text: driverName,
          style: {
            fontSize: 10,
            fontWeight: "600",
            fill: 0x000000,
            fontFamily: "Helvetica",
          },
        });
        nameTxt.alpha = 0.6;
        nameTxt.position.set(textX, CELL_HEIGHT * 0.3);
        c.addChild(nameTxt);
      }

      // Pickup time
      if (pickup || dropoff) {
        const pTxt = new Text({
          text: `${pickup} - ${dropoff}`,
          style: { fontSize: 9, fill: 0x000000, fontFamily: "Helvetica" },
        });
        pTxt.alpha = 0.5;
        pTxt.position.set(textX, CELL_HEIGHT * 0.5);
        c.addChild(pTxt);
      }

      // Dropoff time
      // if (dropoff) {
      //   const dTxt = new Text({
      //     text: `D: ${dropoff}`,
      //     style: { fontSize: 10, fill: 0x000000, fontFamily: "Helvetica" },
      //   });
      //   dTxt.alpha = 0.5;
      //   dTxt.position.set(textX, 34);
      //   c.addChild(dTxt);
      // }

      // Unavailable driver overlay
      if (isUnavailable) {
        drawUnavailableOverlay(c, W, H);
      }
    });
  }
}

function formatDriverName(first: string | null, last: string | null): string {
  const parts = [first, last].filter(Boolean);
  return parts.join(" ");
}
