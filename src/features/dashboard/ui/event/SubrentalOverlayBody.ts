import { Graphics, Sprite } from "pixi.js";
import { Baker } from "../../util/Baker";
import { CELL_HEIGHT, CELL_WIDTH } from "../../values/constants";

/** Same yellow used for quoted events. */
const SUBRENTAL_OVERLAY_COLOR = 0xfffb00;

/**
 * Border-only overlay rendered over accepted subrental date ranges.
 * Styled identically to quoted-event borders (yellow, borderWidth=1, alignment=1).
 * No fill — events and work trackers remain visible through it.
 * Not interactive (eventMode = 'none').
 *
 * On original rows: indicates the bleacher is lent out.
 * On subrental rows: shows the window of borrowed access.
 */
export class SubrentalOverlayBody extends Sprite {
  constructor(
    position: { isStart: boolean; isEnd: boolean; isMiddle: boolean },
    baker: Baker,
    dimensions: { width: number; height: number },
  ) {
    super();

    this.eventMode = "none";

    const { isStart, isEnd } = position;

    const key = `SubrentalOverlay:${isStart ? "start" : isEnd ? "end" : "middle"}`;

    // Mirror the exact geometry used by EventBody for quoted events
    const borderWidth = 1;
    const alignment = 1;
    const L = 0;
    const R = CELL_WIDTH + 2;
    const T = 1; // Math.max(1, topOffset) where topOffset = CELL_HEIGHT → always 1 for overlay
    const B = CELL_HEIGHT + 1;

    const texture = baker.getTexture(
      key,
      { width: CELL_WIDTH + 2, height: CELL_HEIGHT + 2 },
      (c) => {
        const g = new Graphics();

        if (isStart) {
          // Start cell: top, left, and bottom borders
          g.moveTo(L, T)
            .lineTo(R, T)
            .stroke({ width: borderWidth, color: SUBRENTAL_OVERLAY_COLOR, alignment }); // Top
          g.moveTo(L, T)
            .lineTo(L, B)
            .stroke({ width: borderWidth, color: SUBRENTAL_OVERLAY_COLOR, alignment }); // Left
          g.moveTo(L, B)
            .lineTo(R, B)
            .stroke({ width: borderWidth, color: SUBRENTAL_OVERLAY_COLOR, alignment }); // Bottom
        } else if (isEnd) {
          // End cell: top, right, and bottom borders
          const r = R - 2;
          g.moveTo(L, T)
            .lineTo(r + 1, T)
            .stroke({ width: borderWidth, color: SUBRENTAL_OVERLAY_COLOR, alignment }); // Top
          g.moveTo(r, T)
            .lineTo(r, B)
            .stroke({ width: borderWidth, color: SUBRENTAL_OVERLAY_COLOR, alignment }); // Right
          g.moveTo(L, B)
            .lineTo(r, B)
            .stroke({ width: borderWidth, color: SUBRENTAL_OVERLAY_COLOR, alignment }); // Bottom
        } else {
          // Middle cell: only top and bottom borders
          g.moveTo(L, T)
            .lineTo(R, T)
            .stroke({ width: borderWidth, color: SUBRENTAL_OVERLAY_COLOR, alignment }); // Top
          g.moveTo(L, B)
            .lineTo(R, B)
            .stroke({ width: borderWidth, color: SUBRENTAL_OVERLAY_COLOR, alignment }); // Bottom
        }

        c.addChild(g);
      },
    );

    this.texture = texture;
  }
}
