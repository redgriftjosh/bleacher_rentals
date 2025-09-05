import { DateTime } from "luxon";
import { Container, Graphics, Text } from "pixi.js";
import { CELL_WIDTH, HEADER_ROW_HEIGHT } from "../values/constants";

export type HeaderCellTheme = {
  bgWeekday: number;
  bgWeekend: number;
  bgToday: number;
  textMain: number;
  textSub: number;
};

export const DEFAULT_HEADER_THEME: HeaderCellTheme = {
  bgToday: 0xffe020, // yellow-300
  bgWeekend: 0xd1d5db, // gray-300
  bgWeekday: 0xe5e7eb, // gray-200
  textMain: 0x111827, // gray-900-ish
  textSub: 0x9ca3af, // gray-400
};

/**
 * A pooled, reusable header cell with a background and two lines of text.
 * Call setDateISO(...) to update content + colors.
 */
export class HeaderCell extends Container {
  private bg: Graphics;
  private top: Text;
  private sub: Text;

  private _w: number;
  private _h: number;
  private theme: HeaderCellTheme = DEFAULT_HEADER_THEME;
  constructor() {
    super();
    this._w = CELL_WIDTH;
    this._h = HEADER_ROW_HEIGHT;
    // this.theme = theme;

    this.bg = new Graphics();
    this.addChild(this.bg);

    this.top = new Text({
      text: "",
      style: { fill: this.theme.textMain, fontSize: 13, fontWeight: "600", align: "center" },
    });
    this.top.anchor.set(0.5);

    this.sub = new Text({
      text: "",
      style: { fill: this.theme.textSub, fontSize: 11, fontWeight: "300", align: "center" },
    });
    this.sub.anchor.set(0.5);

    this.addChild(this.top, this.sub);
    this.layout();
    this.drawBg(this.theme.bgWeekday);
  }

  /** Set content + background color based on date. */
  setDateISO(iso: string, todayISO?: string) {
    const dt = DateTime.fromISO(iso);
    const isToday = todayISO ? iso === todayISO : dt.hasSame(DateTime.now(), "day");
    const isWeekend = dt.weekday >= 6;

    const bg = isToday
      ? this.theme.bgToday
      : isWeekend
      ? this.theme.bgWeekend
      : this.theme.bgWeekday;
    this.drawBg(bg);

    this.top.text = dt.toFormat("EEE, MMM d");
    this.sub.text = dt.toFormat("yyyy");
  }

  // ------- internal -------

  private layout() {
    // Slightly inset so right/bottom grid lines stay visible
    const pad = 1;

    this.top.x = this._w / 2;
    this.sub.x = this._w / 2;

    // vertical spacing like your React example
    this.top.y = this._h / 2 - 6;
    this.sub.y = this._h / 2 + 8;

    // redraw bg with current color
    this.redrawBg();
  }

  private lastBgColor = 0;
  private redrawBg() {
    this.drawBg(this.lastBgColor || this.theme.bgWeekday);
  }

  private drawBg(color: number) {
    this.lastBgColor = color;
    this.bg
      .clear()
      .rect(0, 0, this._w - 1, this._h - 1)
      .fill(color);
  }
}
