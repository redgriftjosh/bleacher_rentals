import { Application, Container, Graphics, Point } from "pixi.js";
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
    app.stage.emit("hscroll:nx", nx);
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
}
