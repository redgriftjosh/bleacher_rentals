import { Application, Container, FederatedWheelEvent, Graphics, Point } from "pixi.js";
import { getGridSize } from "../values/dynamic";
import {
  CELL_HEIGHT,
  HEADER_ROW_HEIGHT,
  SCROLLBAR_THICKNESS,
  THUMB_LENGTH,
  THUMB_THICKNESS,
} from "../values/constants";
import { clamp } from "../util/scrollbar";
import { Bleacher } from "../db/client/bleachers";

export class VerticalScrollbar {
  private contentY: number = 0; // content pixels (float)
  private thumbY = 0; // track pixels (float)
  private dragging = false;
  private offset = new Point();
  private app: Application;
  private thumb: Graphics;
  private maxY: number;
  private contentMax: number;

  constructor(app: Application, bleachers: Bleacher[], initialScrollY: number | null) {
    app.stage.eventMode = "static"; // allow pointer events
    app.stage.hitArea = app.screen; // allow pointer events anywhere on the stage
    this.app = app;

    const { gridHeight } = getGridSize(app);
    const viewportH = gridHeight - HEADER_ROW_HEIGHT; // visible to the right of the sticky column
    const rows = bleachers.length;
    const contentH = rows * CELL_HEIGHT;

    const scrollbarContainer = new Container();
    scrollbarContainer.position.set(app.screen.width - SCROLLBAR_THICKNESS, 0);

    const track = new Graphics()
      .rect(0, 0, SCROLLBAR_THICKNESS, gridHeight)
      .fill({ color: 0x000000, alpha: 0.15 });
    scrollbarContainer.addChild(track);

    this.thumb = new Graphics()
      .rect(0, 0, THUMB_THICKNESS, THUMB_LENGTH)
      .fill({ color: 0x000000, alpha: 0.15 });
    this.thumb.eventMode = "static";
    scrollbarContainer.addChild(this.thumb);

    app.stage.addChild(scrollbarContainer);

    this.maxY = Math.max(0, gridHeight - THUMB_LENGTH);
    this.contentMax = Math.max(0, contentH - viewportH);

    // function applyContentY(next: number) {
    //   contentY = clamp(next, 0, contentMax);
    //   // derive thumb from content
    //   thumbY = contentMax > 0 ? (contentY / contentMax) * maxY : 0;
    //   thumb.position.y = Math.round(thumbY);
    //   app.stage.emit("hscroll:ny", thumbY);
    // }

    // let contentY = 0; // content pixels (float)
    // let thumbY = 0; // track pixels (float)
    // let dragging = false;
    // const offset = new Point();

    app.stage.on("hscroll:ny", (v: number) => {
      if (this.dragging) return;
      this.thumbY = clamp(v, 0, this.maxY);
      this.contentY = this.contentMax > 0 ? (this.thumbY / this.maxY) * this.contentMax : 0;
      this.thumb.position.y = Math.round(this.thumbY);
    });

    const onMove = (e: any) => {
      if (!this.dragging || !this.thumb.parent) return;
      const p = this.thumb.parent.toLocal(e.global);
      const ny = clamp(p.y - this.offset.y, 0, this.maxY); // <-- clamp here
      const nextContent = this.contentMax > 0 ? (ny / this.maxY) * this.contentMax : 0;
      this.applyContentY(nextContent);
    };

    const onUp = () => {
      this.dragging = false;
      app.stage.off("pointermove", onMove);
      app.stage.off("pointerup", onUp);
      app.stage.off("pointerupoutside", onUp);
    };

    this.thumb.on("pointerdown", (e) => {
      this.dragging = true;
      if (!this.thumb.parent) return;
      const p = this.thumb.parent.toLocal(e.global);
      this.offset.set(0, p.y - this.thumb.y);

      // listen on stage so we don’t lose the drag
      app.stage.on("pointermove", onMove);
      app.stage.on("pointerup", onUp);
      app.stage.on("pointerupoutside", onUp);
    });

    app.stage.on("wheel", (e: FederatedWheelEvent) => {
      // Use horizontal delta; fall back to vertical when Shift is held (common UX)
      let dy = e.deltaY;

      // Normalize deltaMode: 0=pixels, 1=lines, 2=pages
      if (e.deltaMode === 1) dy *= 16;
      else if (e.deltaMode === 2) dy *= 100;

      // Optional: invert if you prefer the other "natural" direction
      const DIR = 1; // set to -1 to invert
      const nextContent = this.contentY + DIR * dy; // accumulate FRACTIONAL content px
      this.applyContentY(nextContent);

      e.preventDefault(); // prevent page from scrolling horizontally
    });

    this.setInitialScrollY(initialScrollY);
  }

  private applyContentY(next: number) {
    this.contentY = clamp(next, 0, this.contentMax);
    // derive thumb from content
    this.thumbY = this.contentMax > 0 ? (this.contentY / this.contentMax) * this.maxY : 0;
    this.thumb.position.y = Math.round(this.thumbY);
    this.app.stage.emit("hscroll:ny", this.thumbY);
  }

  private setInitialScrollY(initialScrollY: number | null) {
    // Halfway on mount (defer 1 tick so listeners are attached)
    this.app.ticker.addOnce(() => {
      const initialRatio = 0;
      this.contentY = initialScrollY ?? initialRatio * this.contentMax;
      this.applyContentY(this.contentY);
    });
  }

  public getContentY(): number {
    return this.contentY;
  }
}
