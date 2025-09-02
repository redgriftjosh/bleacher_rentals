import { Application } from "pixi.js";
import { scrollbar } from "./scrollbar";
import { grid } from "./grid";

export function dashboard(app: Application) {
  grid(app);

  /*
  Scroll Bar Testing
  this is stuff for the scroll bar
  */
  // const SB_W = 20; // scrollbar width
  // const SB_Y = padY + gridH + (padY - SB_W) / 2;
  // const thumbWidth = 50;

  // const ScrollbarContainer = new Container();
  // ScrollbarContainer.position.set(padX, SB_Y);

  // const rectangle = new Graphics().rect(0, 0, gridW, SB_W).fill({ color: 0x000000, alpha: 0.15 });
  // // ScrollbarContainer.addChild(rectangle);

  // const thumb = new Graphics().rect(0, 0, thumbWidth, SB_W).fill({ color: 0x000000, alpha: 0.15 });
  // thumb.eventMode = "dynamic";
  // thumb.cursor = "grab";
  // thumb.on('pointermove', () => updatePosition());

  scrollbar(app);

  // app.stage.addChild(rectangle2);

  // function updatePosition() {
  //   const localY = getLocalY((e as any).clientY ?? e.data.global.y);
  //   const newThumbY = clamp(localY - dragOffset, 0, gridH - thumbWidth);
  //   thumb.y = newThumbY;
  // }
}
