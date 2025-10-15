import { Sprite, Text } from "pixi.js";
import { Baker } from "../util/Baker";
import { Tile } from "./Tile";
import { DashboardEvent } from "../types";

export class EventLeftColumnCell extends Sprite {
  constructor(dimensions: { width: number; height: number }, baker: Baker, event: DashboardEvent) {
    super();
    const key = `EventLeftColumnCell:${event.eventId}:${dimensions.width}x${dimensions.height}`;
    const texture = baker.getTexture(key, dimensions, (c) => {
      const tile = new Tile(dimensions, baker, 0, 0);

      // Compute ellipsized title that fits available width
      const titleStyleObj = { fill: 0x333333, fontSize: 12, fontWeight: "bold" } as const;
      const paddingX = 5;
      const maxTitleWidth = Math.max(0, dimensions.width - paddingX * 2);

      // Hidden measurer for width
      const measurer = new Text({ text: "", style: titleStyleObj });

      const measureWidth = (t: string) => {
        measurer.text = t;
        return measurer.width;
      };

      const ellipsize = (text: string): string => {
        if (!text) return "";
        const fullWidth = measureWidth(text);
        if (fullWidth <= maxTitleWidth) return text;
        const ell = "…";
        const ellWidth = measureWidth(ell);
        if (ellWidth > maxTitleWidth) return ""; // nothing fits
        let low = 0;
        let high = text.length;
        while (low < high) {
          const mid = Math.ceil((low + high) / 2);
          const candidate = text.slice(0, mid) + ell;
          const w = measureWidth(candidate);
          if (w <= maxTitleWidth) low = mid;
          else high = mid - 1;
        }
        return text.slice(0, low) + ell;
      };

      const title = new Text({
        text: ellipsize(event.eventName),
        style: titleStyleObj,
      });
      title.anchor.set(0, 0);
      title.x = paddingX;

      const city = event.addressData?.city ?? null;
      const state = event.addressData?.state ?? null;

      if (city && state) {
        const sub = new Text({
          text: `${city}, ${state}`,
          style: { fill: 0x777777, fontSize: 10 },
        });
        sub.anchor.set(0, 0);
        sub.x = paddingX;
        sub.y = dimensions.height - sub.height - 5;
        // Place title just above the subtext
        title.y = sub.y - title.height - 2;
        c.addChild(tile, title, sub);
      } else {
        // No subtext: keep title near bottom
        title.y = dimensions.height - title.height - 5;
        c.addChild(tile, title);
      }
    });

    this.texture = texture;
  }
}
