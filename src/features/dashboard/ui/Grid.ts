import { Application, Container, Text } from "pixi.js";
import { StickyLeftColumn } from "./StickyLeftColumn";
import { StickyTopRow } from "./StickyTopRow";
import { MainScrollableGrid } from "./MainScrollableGrid";
import { StickyTopLeftCell } from "./StickyTopLeftCell";
import { Bleacher } from "../db/client/bleachers";
import { getGridSize } from "../values/dynamic";
import { getColumnsAndDates } from "../util/scrollbar";
import { CELL_HEIGHT, CELL_WIDTH, THUMB_LENGTH } from "../values/constants";
import { CurrentEventState } from "@/app/(dashboards)/bleachers-dashboard/_lib/useCurrentEventStore";

export class Grid {
  constructor(app: Application, bleachers: Bleacher[]) {
    const { gridWidth, gridHeight } = getGridSize(app);
    const { columns, dates } = getColumnsAndDates();
    const rows = bleachers.length;

    const gridContainer = new Container();
    app.stage.addChild(gridContainer);

    const viewportH = gridHeight - CELL_HEIGHT;
    const viewportW = gridWidth - CELL_WIDTH;

    const visibleRows = Math.min(bleachers.length, Math.ceil(viewportH / CELL_HEIGHT) + 1);
    const visibleColumns = Math.min(columns, Math.ceil(viewportW / CELL_WIDTH) + 0);

    const contentW = columns * CELL_WIDTH; // total scrollable content width
    const contentH = rows * CELL_HEIGHT; // total scrollable content height

    const xThumbTravel = Math.max(1, gridWidth - THUMB_LENGTH);
    const yThumbTravel = Math.max(1, gridHeight - THUMB_LENGTH);

    const xContentMax = Math.max(0, contentW - viewportW);
    const yContentMax = Math.max(0, contentH - viewportH);

    const stickyTopLeftCell = new StickyTopLeftCell(app);
    gridContainer.addChild(stickyTopLeftCell);

    const stickyLeftColumn = new StickyLeftColumn(app, gridHeight, bleachers, visibleRows);
    gridContainer.addChild(stickyLeftColumn);

    const stickyTopRow = new StickyTopRow(app, gridWidth, columns, dates, visibleColumns);
    gridContainer.addChild(stickyTopRow);

    const mainScrollableGrid = new MainScrollableGrid(
      app,
      gridWidth,
      gridHeight,
      bleachers,
      visibleRows,
      visibleColumns,
      dates
    );
    gridContainer.addChild(mainScrollableGrid);

    app.stage.on("hscroll:ny", (thumbY: number) => {
      const ratio = thumbY / yThumbTravel;
      const contentY = Math.round(ratio * yContentMax);

      stickyLeftColumn.updateY(contentY);
      mainScrollableGrid.updateY(contentY);
    });

    app.stage.on("hscroll:nx", (thumbX: number) => {
      const ratio = thumbX / xThumbTravel;
      const contentX = Math.round(ratio * xContentMax);

      stickyTopRow.updateX(contentX);
      mainScrollableGrid.updateX(contentX);
    });
  }
}
