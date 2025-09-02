import { Application, Graphics, Point } from "pixi.js";

export function scrollbar(app: Application) {
  app.stage.eventMode = "static";
  app.stage.hitArea = app.screen;

  const thumb = new Graphics().rect(0, 0, 50, 30).fill({ color: 0x000000, alpha: 0.15 });
  thumb.eventMode = "static";
  thumb.position.set(100, 100);

  app.stage.addChild(thumb);

  let dragging = false;
  const offset = new Point();

  const onMove = (e: any) => {
    if (!dragging) return;
    // Convert pointer to the rect's parent space
    if (!thumb.parent) return;
    const p = thumb.parent.toLocal(e.global);
    thumb.position.set(p.x - offset.x, p.y - offset.y);
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
    offset.set(p.x - thumb.x, p.y - thumb.y);

    // listen on stage so we don’t lose the drag
    app.stage.on("pointermove", onMove);
    app.stage.on("pointerup", onUp);
    app.stage.on("pointerupoutside", onUp);
  });
}
