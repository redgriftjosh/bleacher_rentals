import { Container, Graphics, Text } from "pixi.js";
import { BleacherEvent } from "../db/client/bleachers";
import { CELL_HEIGHT, CELL_WIDTH } from "../values/constants";

export type EventSpanType = { start: number; end: number; ev: BleacherEvent };

export class EventSpan extends Container {
  private g: Graphics;
  private eventLabel: Text;
  private currentSpan?: EventSpanType;

  constructor() {
    super();
    this.g = new Graphics();
    this.addChild(this.g);

    this.eventLabel = new Text({
      text: "",
      style: {
        fontSize: 12,
        fontWeight: "400",
        align: "left",
      },
    });
    this.addChild(this.eventLabel);

    this.visible = false;
  }

  draw(
    span: EventSpanType,
    visibleStartColumn: number,
    visibleEndColumn: number,
    rowY: number,
    wrappedX: number
  ) {
    this.currentSpan = span;
    const cssColour = span.ev.hslHue ? `hsl(${span.ev.hslHue}, 60%, 60%)` : "hsl(0, 0%, 50%)";

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

    this.g.clear();
    this.g.rect(x, y, width, height).fill(cssColour);

    if (this.needsPin(visibleStartColumn, wrappedX)) {
      this.updatePinnedLabel(0, wrappedX, rowY);
    } else {
      // Update label text & position

      this.eventLabel.x = x;
      this.eventLabel.y = y;
    }
    this.eventLabel.text = span.ev.eventName;

    this.visible = true;
  }

  updatePinnedLabel(labelOffsetPx: number, wrappedX: number, rowY: number) {
    if (!this.visible) return;
    this.eventLabel.x = labelOffsetPx + wrappedX;
    this.eventLabel.y = rowY;
  }

  /** True if the span's real beginning is off the left edge of the viewport. */
  needsPin(visStartCol: number, wrappedX: number): boolean {
    if (!this.currentSpan) return false;
    const s = this.currentSpan.start;
    return s < visStartCol || (s === visStartCol && wrappedX > 0);
  }

  hide() {
    this.g.clear();
    this.eventLabel.text = "";
    this.currentSpan = undefined;
    this.visible = false;
  }
}
