import { Application, Container, FederatedWheelEvent, Graphics, Point } from "pixi.js";
import {
  CELL_WIDTH,
  SCROLLBAR_THICKNESS,
  THUMB_LENGTH,
  THUMB_THICKNESS,
} from "../values/constants";
import { getGridSize } from "../values/dynamic";
import { clamp, getColumnsAndDates } from "../util/scrollbar";

export function horizontalScrollbar(app: Application) {
  app.stage.eventMode = "static"; // allow pointer events
  app.stage.hitArea = app.screen; // allow pointer events anywhere on the stage

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
  const contentMax = Math.max(0, contentW - viewportW);

  function applyContentX(next: number) {
    contentX = clamp(next, 0, contentMax);
    // derive thumb from content
    thumbX = contentMax > 0 ? (contentX / contentMax) * maxX : 0;

    // draw (you can round for crisp pixels, but keep 'contentX' float!)
    thumb.position.x = Math.round(thumbX);

    // Emit either ratio or thumb pixels — your grid knows how to map it
    app.stage.emit("hscroll:nx", thumbX); // if your grid expects thumb space
    // OR: app.stage.emit("hscroll:ratio", contentMax ? contentX / contentMax : 0);
  }

  // const setScrollX = (x: number) => {
  //   scrollX = clamp(Math.round(x), 0, maxX); // shift pattern like normal scroll
  //   app.stage.emit("hscroll:nx", scrollX); // keep the thumb in sync (if it listens)
  // };

  // Keep two floats: content scroll + derived thumb pos
  let contentX = 0; // content pixels (float)
  let thumbX = 0; // track pixels (float)
  let dragging = false;
  const offset = new Point();

  app.stage.on("hscroll:nx", (v: number) => {
    if (dragging) return;
    // thumb.position.set(v, 0);
    thumbX = clamp(v, 0, maxX);
    contentX = contentMax > 0 ? (thumbX / maxX) * contentMax : 0;
    thumb.position.x = Math.round(thumbX);
  });

  const onMove = (e: any) => {
    if (!dragging || !thumb.parent) return;
    const p = thumb.parent.toLocal(e.global);
    const nx = clamp(p.x - offset.x, 0, maxX);
    const nextContent = contentMax > 0 ? (nx / maxX) * contentMax : 0;
    applyContentX(nextContent);
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
    // const contentDelta = DIR * dx;
    // const scale = contentMax > 0 ? maxX / contentMax : 0; // mapping factor
    // const thumbDelta = contentDelta * scale; // convert to thumb pixels
    // setScrollX(scrollX + thumbDelta);
    const nextContent = contentX + DIR * dx; // accumulate FRACTIONAL content px
    applyContentX(nextContent);

    e.preventDefault(); // prevent page from scrolling horizontally
  });
}
