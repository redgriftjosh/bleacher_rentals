import {
  Application,
  Container,
  Graphics,
  RenderTexture,
  TilingSprite,
  Text,
  Rectangle,
} from "pixi.js";
import { CELL_HEIGHT, CELL_WIDTH, THUMB_LENGTH } from "../../values/constants";
import { getGridSize } from "../../values/dynamic";
import { Bleacher } from "../../db/client/bleachers";
import { createGridTilingSprites } from "./createGridTilingSprites";
import { createTile } from "./createTile";

export function grid(app: Application, bleachers: Bleacher[]) {
  const { gridWidth, gridHeight } = getGridSize(app);

  const gridContainer = new Container();
  app.stage.addChild(gridContainer);

  const { mainScrollableGrid, stickyLeftColumn, stickyTopRow, stickyTopLeftCell } =
    createGridTilingSprites(app, gridWidth, gridHeight);
  gridContainer.addChild(mainScrollableGrid, stickyLeftColumn, stickyTopRow, stickyTopLeftCell);

  // ====== DATA → labels in sticky left column ======
  const rows = bleachers.length;
  const viewportH = gridHeight - CELL_HEIGHT; // visible area under header
  const contentH = rows * CELL_HEIGHT; // total scrollable content height
  const thumbTravel = Math.max(1, viewportH - THUMB_LENGTH);
  const contentMax = Math.max(0, contentH - viewportH);
  const visibleRows = Math.min(rows, Math.ceil(viewportH / CELL_HEIGHT) + 2);

  // labels layer (sticks horizontally, scrolls vertically)
  const leftLabels = new Container();
  leftLabels.position.set(0, CELL_HEIGHT); // start under header
  gridContainer.addChild(leftLabels);

  const pool: Text[] = [];
  for (let i = 0; i < visibleRows; i++) {
    const t = new Text({ text: "", style: { fill: 0x333333, fontSize: 14, align: "center" } });
    t.anchor.set(0.5);
    t.x = CELL_WIDTH / 2;
    t.y = i * CELL_HEIGHT + CELL_HEIGHT / 2; // relative within the pool
    leftLabels.addChild(t);
    pool.push(t);
  }

  function updateLabels(contentY: number) {
    // wrap grid pattern so UVs stay small (no shimmer)
    const wrapped = ((contentY % CELL_HEIGHT) + CELL_HEIGHT) % CELL_HEIGHT;
    mainScrollableGrid.tilePosition.y = -wrapped;
    stickyLeftColumn.tilePosition.y = -wrapped;

    // position label layer by phase only…
    leftLabels.y = CELL_HEIGHT - wrapped;

    // …and compute which data rows are visible
    const first = Math.floor(contentY / CELL_HEIGHT);
    for (let i = 0; i < pool.length; i++) {
      const row = first + i;
      const t = pool[i];
      if (row < 0 || row >= rows) {
        t.visible = false;
        continue;
      }
      t.visible = true;
      t.text = String(bleachers[row].bleacher_number);
      // t.y stays at i*CELL_HEIGHT + CELL_HEIGHT/2 (we’re moving the container instead)
    }
  }

  app.stage.on("hscroll:ny", (thumbY: number) => {
    const ratio = thumbY / thumbTravel;
    const contentY = Math.round(ratio * contentMax);

    updateLabels(contentY);
  });

  app.stage.on("hscroll:nx", (v: number) => {
    mainScrollableGrid.tilePosition.x = -v;
    stickyTopRow.tilePosition.x = -v;
  });
}
