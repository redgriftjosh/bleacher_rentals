import { Graphics, Sprite, Text } from "pixi.js";
import { Baker } from "../../../util/Baker";
import { CELL_HEIGHT, CELL_WIDTH } from "../../../values/constants";
import type { BleacherWorkTracker } from "../../../types";
import { STATUS_TINT } from "./statusTint";

/**
 * Half-width work tracker display (2 trackers side by side, no event overlap).
 * Shows driver name + pickup/dropoff times, center-aligned. No truck icon.
 * Uses bleed pattern: texture is halfW+2 × CELL_HEIGHT+2.
 */
export class WorkTrackerHalf extends Sprite {
  constructor(baker: Baker, tracker: BleacherWorkTracker, isLeft: boolean) {
    super();

    const halfW = Math.floor(CELL_WIDTH / 2);
    const W = halfW + 2;
    const H = CELL_HEIGHT + 2;
    const bg = STATUS_TINT[tracker.status] ?? 0x808080;

    const driverName = formatDriverName(tracker.driverFirstName, tracker.driverLastName);
    const pickup = tracker.pickupTime ?? "";
    const dropoff = tracker.dropoffTime ?? "";

    const cacheKey = `WTHalf:${tracker.status}:${driverName}:${pickup}:${dropoff}:${isLeft ? "L" : "R"}`;

    this.texture = baker.getTexture(cacheKey, { width: W, height: H }, (c) => {
      // Background fill
      const fill = new Graphics().rect(0, 0, W, H).fill(bg);
      c.addChild(fill);

      // Border
      const border = new Graphics();
      border.rect(0.5, 0.5, W - 1, H - 1).stroke({ width: 1, color: 0x000000, alpha: 0.5 });
      c.addChild(border);

      // Driver First name (center-aligned)
      if (tracker.driverFirstName) {
        const firstNameTxt = new Text({
          text: truncate(tracker.driverFirstName, 8),
          style: {
            fontSize: 10,
            fontWeight: "600",
            fill: 0x000000,
            fontFamily: "Helvetica",
            align: "center",
          },
        });
        firstNameTxt.alpha = 0.6;
        firstNameTxt.anchor.set(0.5, 0);
        firstNameTxt.position.set(W / 2, CELL_HEIGHT * 0.1);
        c.addChild(firstNameTxt);
      }

      // Driver Last name (center-aligned)
      if (tracker.driverLastName) {
        const lastNameTxt = new Text({
          text: truncate(tracker.driverLastName, 8),
          style: {
            fontSize: 10,
            fontWeight: "600",
            fill: 0x000000,
            fontFamily: "Helvetica",
            align: "center",
          },
        });
        lastNameTxt.alpha = 0.6;
        lastNameTxt.anchor.set(0.5, 0);
        lastNameTxt.position.set(W / 2, CELL_HEIGHT * 0.3);
        c.addChild(lastNameTxt);
      }

      // Pickup time
      if (pickup) {
        const pTxt = new Text({
          text: `${pickup}`,
          style: { fontSize: 9, fill: 0x000000, fontFamily: "Helvetica", align: "center" },
        });
        pTxt.alpha = 0.5;
        pTxt.anchor.set(0.5, 0);
        pTxt.position.set(W / 2, CELL_HEIGHT * 0.55);
        c.addChild(pTxt);
      }

      // Dropoff time
      if (dropoff) {
        const dTxt = new Text({
          text: `${dropoff}`,
          style: { fontSize: 9, fill: 0x000000, fontFamily: "Helvetica", align: "center" },
        });
        dTxt.alpha = 0.5;
        dTxt.anchor.set(0.5, 0);
        dTxt.position.set(W / 2, CELL_HEIGHT * 0.75);
        c.addChild(dTxt);
      }
    });
  }
}

function formatDriverName(first: string | null, last: string | null): string {
  const parts = [first, last].filter(Boolean);
  return parts.join(" ");
}

function truncate(str: string | null, max: number): string {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + ".." : str;
}
