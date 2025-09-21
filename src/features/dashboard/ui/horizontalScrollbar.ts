import { Application, Container, FederatedWheelEvent, Graphics, Point } from "pixi.js";
import {
  CELL_WIDTH,
  SCROLLBAR_THICKNESS,
  THUMB_LENGTH,
  THUMB_THICKNESS,
} from "../values/constants";
import { getGridSize } from "../values/dynamic";
import { clamp, getColumnsAndDates } from "../util/scrollbar";

export class HorizontalScrollbar {
  private contentX: number = 0;
  private contentMax: number;
  private maxX: number;
  private app: Application;
  private thumbX: number = 0; // track pixels (float)
  private dragging = false;
  private thumb: Graphics;
  private offset = new Point();

  constructor(app: Application, initialScrollX: number | null) {
    console.log("Constructing HorizontalScrollbar", initialScrollX);
    app.stage.eventMode = "static"; // allow pointer events
    app.stage.hitArea = app.screen; // allow pointer events anywhere on the stage
    this.app = app;

    // values
    const { gridWidth } = getGridSize(app);
    const { columns } = getColumnsAndDates();
    const viewportW = gridWidth - CELL_WIDTH; // visible to the right of the sticky column
    const contentW = columns * CELL_WIDTH;

    // container for entire scrollbar
    const scrollbarContainer = new Container();
    scrollbarContainer.position.set(0, app.screen.height - SCROLLBAR_THICKNESS);

    const track = new Graphics()
      .rect(0, 0, gridWidth, SCROLLBAR_THICKNESS)
      .fill({ color: 0x000000, alpha: 0.15 });
    scrollbarContainer.addChild(track);

    this.thumb = new Graphics()
      .rect(0, 0, THUMB_LENGTH, THUMB_THICKNESS)
      .fill({ color: 0x000000, alpha: 0.15 });
    this.thumb.eventMode = "static";
    scrollbarContainer.addChild(this.thumb);

    app.stage.addChild(scrollbarContainer);

    this.maxX = Math.max(0, gridWidth - THUMB_LENGTH);
    this.contentMax = Math.max(0, contentW - viewportW);

    this.listenToHScrollNX();

    this.listenToDragThumb();
    this.setInitialScrollX(initialScrollX);
    this.listenToScrollWheel();
  }

  private listenToHScrollNX() {
    this.app.stage.on("hscroll:nx", (v: number) => {
      if (this.dragging) return;
      // thumb.position.set(v, 0);
      this.thumbX = clamp(v, 0, this.maxX);
      this.contentX = this.contentMax > 0 ? (this.thumbX / this.maxX) * this.contentMax : 0;
      this.thumb.position.x = Math.round(this.thumbX);
    });
  }

  private listenToDragThumb() {
    this.thumb.on("pointerdown", (e) => {
      this.dragging = true;
      if (!this.thumb.parent) return;
      const p = this.thumb.parent.toLocal(e.global);
      this.offset.set(p.x - this.thumb.x, 0);

      // listen on stage so we don’t lose the drag
      this.app.stage.on("pointermove", onMove);
      this.app.stage.on("pointerup", onUp);
      this.app.stage.on("pointerupoutside", onUp);
    });

    const onMove = (e: any) => {
      if (!this.dragging || !this.thumb.parent) return;
      const p = this.thumb.parent.toLocal(e.global);
      const nx = clamp(p.x - this.offset.x, 0, this.maxX);
      const nextContent = this.contentMax > 0 ? (nx / this.maxX) * this.contentMax : 0;
      this.applyContentX(nextContent);
    };

    const onUp = () => {
      this.dragging = false;
      this.app.stage.off("pointermove", onMove);
      this.app.stage.off("pointerup", onUp);
      this.app.stage.off("pointerupoutside", onUp);
    };
  }

  private setInitialScrollX(initialScrollX: number | null) {
    // Halfway on mount (defer 1 tick so listeners are attached)
    this.app.ticker.addOnce(() => {
      const initialRatio = 0.5;
      this.contentX = initialScrollX ?? initialRatio * this.contentMax;
      this.applyContentX(this.contentX);
    });
  }

  private listenToScrollWheel() {
    this.app.stage.on("wheel", (e: FederatedWheelEvent) => {
      // Use horizontal delta; fall back to vertical when Shift is held (common UX)
      let dx = Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;

      // Normalize deltaMode: 0=pixels, 1=lines, 2=pages
      if (e.deltaMode === 1) dx *= 16;
      else if (e.deltaMode === 2) dx *= 100;

      const DIR = 1; // set to -1 to invert
      const nextContent = this.contentX + DIR * dx; // accumulate FRACTIONAL content px
      this.applyContentX(nextContent);

      e.preventDefault(); // prevent page from scrolling horizontally
    });
  }

  private applyContentX(next: number) {
    this.contentX = clamp(next, 0, this.contentMax);
    this.thumbX = this.contentMax > 0 ? (this.contentX / this.contentMax) * this.maxX : 0;
    this.thumb.position.x = Math.round(this.thumbX);
    this.app.stage.emit("hscroll:nx", this.thumbX);
  }

  public getContentX(): number {
    return this.contentX;
  }
}
