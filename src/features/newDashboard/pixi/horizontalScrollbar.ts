import { Application, Container, FederatedWheelEvent, Graphics, Point } from "pixi.js";
import {
  DASHBOARD_PADDING_X,
  SCROLLBAR_THICKNESS,
  THUMB_LENGTH,
  THUMB_THICKNESS,
} from "../values/constants";
import { getGridSize, getHorizontalScrollbarYPosition } from "../values/dynamic";

export function horizontalScrollbar(app: Application) {
  app.stage.eventMode = "static"; // allow pointer events
  app.stage.hitArea = app.screen; // allow pointer events anywhere on the stage

  // values
  const { gridWidth } = getGridSize(app);
  const scrollbarY = getHorizontalScrollbarYPosition(app);

  // container for entire scrollbar
  const scrollbarContainer = new Container();
  scrollbarContainer.position.set(DASHBOARD_PADDING_X, scrollbarY);

  const track = new Graphics()
    .rect(0, 0, gridWidth, SCROLLBAR_THICKNESS)
    .fill({ color: 0x000000, alpha: 0.15 });
  scrollbarContainer.addChild(track);

  const thumb = new Graphics()
    .rect(0, 0, THUMB_LENGTH, THUMB_THICKNESS)
    .fill({ color: 0x000000, alpha: 0.15 });
  thumb.eventMode = "static";
  scrollbarContainer.addChild(thumb);

  app.stage.addChild(scrollbarContainer);

  /*
  Dragging Logic
  */

  const maxX = Math.max(0, gridWidth - THUMB_LENGTH);

  const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);

  const setScrollX = (x: number) => {
    scrollX = clamp(Math.round(x), 0, maxX); // shift pattern like normal scroll
    app.stage.emit("hscroll:nx", scrollX); // keep the thumb in sync (if it listens)
  };

  let dragging = false;
  const offset = new Point();

  const onMove = (e: any) => {
    if (!dragging) return;
    // Convert pointer to the rect's parent space
    if (!thumb.parent) return;
    const p = thumb.parent.toLocal(e.global);
    const nx = clamp(p.x - offset.x, 0, maxX); // <-- clamp here
    thumb.position.set(nx, 0);
    console.log("nx:", nx);
    setScrollX(nx);
  };

  const onUp = () => {
    dragging = false;
    app.stage.off("pointermove", onMove);
    app.stage.off("pointerup", onUp);
    app.stage.off("pointerupoutside", onUp);
  };

  thumb.on("pointerdown", (e) => {
    dragging = true;
    if (!thumb.parent) return;
    const p = thumb.parent.toLocal(e.global);
    offset.set(p.x - thumb.x, 0);

    // listen on stage so we don’t lose the drag
    app.stage.on("pointermove", onMove);
    app.stage.on("pointerup", onUp);
    app.stage.on("pointerupoutside", onUp);
  });

  /*
  Trackpad Scrolling Logic
  */
  app.stage.on("wheel", (e: FederatedWheelEvent) => {
    // Use horizontal delta; fall back to vertical when Shift is held (common UX)
    let dx = Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;

    // Normalize deltaMode: 0=pixels, 1=lines, 2=pages
    if (e.deltaMode === 1) dx *= 16;
    else if (e.deltaMode === 2) dx *= 100;

    // Optional: invert if you prefer the other "natural" direction
    const DIR = 1; // set to -1 to invert
    setScrollX(scrollX + DIR * dx);

    e.preventDefault(); // prevent page from scrolling horizontally
  });
}
