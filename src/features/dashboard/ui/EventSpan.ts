import { Container } from "pixi.js";
import type { BleacherEvent } from "../db/client/bleachers";
import { CELL_HEIGHT, CELL_WIDTH, BLEACHER_COLUMN_WIDTH } from "../values/constants";
import { Baker } from "../util/Baker";
import { EventSpanLabel } from "./EventSpanLabel";
import { EventSpanBody } from "./EventSpanBody";

export type EventSpanType = { start: number; end: number; ev: BleacherEvent };

/**
 * Main virtualized span node: coordinates a baked label and a 3-slice baked body.
 * Keeps the same external API as your previous EventSpan for a drop-in swap.
 */
export class EventSpan extends Container {
  private spanLabel: EventSpanLabel;
  private body: EventSpanBody;
  private currentSpan?: EventSpanType;

  constructor(baker: Baker) {
    super();
    this.eventMode = "none";

    this.body = new EventSpanBody(baker);
    this.spanLabel = new EventSpanLabel(baker);

    // body should be under label so text draws above
    this.addChild(this.body, this.spanLabel);

    this.visible = false;
  }

  /** Draws the clipped body and places the spanLabel (pinned or not) for the current viewport. */
  draw(
    span: EventSpanType,
    visibleStartColumn: number,
    visibleEndColumn: number,
    rowY: number,
    wrappedX: number
  ) {
    this.currentSpan = span;

    // clip horizontally to viewport
    const drawStart = Math.max(span.start, visibleStartColumn);
    const drawEnd = Math.min(span.end, visibleEndColumn);
    if (drawEnd < drawStart) {
      this.hide();
      return;
    }

    const x = (drawStart - visibleStartColumn) * CELL_WIDTH;
    const y = rowY;
    const width = (drawEnd - drawStart + 1) * CELL_WIDTH - 1;
    const height = CELL_HEIGHT - 1;

    // tint color (from hslHue, default gray)
    const tint = span.ev.hslHue != null ? hslToRgbInt(span.ev.hslHue, 60, 60) : 0x808080;

    // show caps only if true edges are visible
    const showLeftCap = span.start >= visibleStartColumn && wrappedX === 0;
    const showRightCap = span.end <= visibleEndColumn;

    this.body.draw(x, y, width, height, tint, showLeftCap, showRightCap);

    // spanLabel: bake once per event, then place pinned/unpinned
    this.spanLabel.setEvent(span.ev);
    if (this.needsPin(visibleStartColumn, wrappedX)) {
      // Pinned: sits at left edge of the viewport; X is offset by wrappedX
      this.updatePinnedLabel(0, wrappedX, y);
    } else {
      // Unpinned: scrolls with the body and starts at the clipped rect x
      this.spanLabel.placeUnpinned(x, y);
    }

    this.visible = true;
  }

  /** True if the span's real beginning is off the left edge of the viewport. */
  needsPin(visStartCol: number, wrappedX: number): boolean {
    if (!this.currentSpan) return false;
    const s = this.currentSpan.start;
    return s < visStartCol || (s === visStartCol && wrappedX > 0);
  }

  /** For your existing updatePinnedLabels() path: nudge the spanLabel while pinned. */
  updatePinnedLabel(labelOffsetPx: number, wrappedX: number, rowY: number) {
    if (!this.visible) return;
    this.spanLabel.placePinned(labelOffsetPx + wrappedX, rowY);
  }

  hide() {
    this.visible = false;
    this.body.hide();
    this.spanLabel.hide();
    this.currentSpan = undefined;
  }
}

/** Convert HSL (0–360, 0–100, 0–100) to 0xRRGGBB int for sprite.tint. */
function hslToRgbInt(h: number, s: number, l: number): number {
  const S = s / 100,
    L = l / 100;
  const C = (1 - Math.abs(2 * L - 1)) * S;
  const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - C / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [C, X, 0];
  else if (h < 120) [r, g, b] = [X, C, 0];
  else if (h < 180) [r, g, b] = [0, C, X];
  else if (h < 240) [r, g, b] = [0, X, C];
  else if (h < 300) [r, g, b] = [X, 0, C];
  else [r, g, b] = [C, 0, X];
  const R = Math.round((r + m) * 255);
  const G = Math.round((g + m) * 255);
  const B = Math.round((b + m) * 255);
  return (R << 16) | (G << 8) | B;
}
