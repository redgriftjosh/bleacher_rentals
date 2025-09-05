import { Application, Container, Graphics, TilingSprite } from "pixi.js";
import { HeaderCell } from "./HeaderCell";
import { Tile } from "./Tile";
import { DateTime } from "luxon";
import { BLEACHER_COLUMN_WIDTH, CELL_WIDTH, HEADER_ROW_HEIGHT } from "../values/constants";

export class StickyTopRow extends Container {
  private background: TilingSprite;
  private labels: Container;
  private prevFirstVisibleColumn = -1;
  private labelPool: HeaderCell[] = [];
  private dates: string[];
  private todayISO: string;

  constructor(
    app: Application,
    gridWidth: number,
    columns: number,
    dates: string[],
    visibleColumns: number
  ) {
    super();
    this.dates = dates;
    this.todayISO = DateTime.now().toISODate();

    const headerTile = new Tile(app, { width: CELL_WIDTH, height: HEADER_ROW_HEIGHT }).texture;

    this.background = new TilingSprite({
      texture: headerTile,
      width: gridWidth - BLEACHER_COLUMN_WIDTH,
      height: HEADER_ROW_HEIGHT,
      position: { x: BLEACHER_COLUMN_WIDTH, y: 0 },
    });

    const mask = new Graphics()
      .rect(BLEACHER_COLUMN_WIDTH, 0, gridWidth - BLEACHER_COLUMN_WIDTH, HEADER_ROW_HEIGHT)
      .fill(0xffffff);
    this.background.addChild(mask);
    this.background.mask = mask;

    this.labels = new Container();
    this.labels.position.set(CELL_WIDTH, 0);
    this.addChild(this.labels);
    this.labels.mask = mask;

    for (let i = 0; i < visibleColumns; i++) {
      const cell = new HeaderCell();
      cell.x = i * CELL_WIDTH;
      cell.y = 0;
      this.labels.addChild(cell);
      this.labelPool.push(cell);
    }

    this.addChild(this.background, mask, this.labels);
    this.mask = mask;

    // initial bind
    this.updateX(0);
  }

  /** Call every time horizontal content scroll changes (in pixels). */
  updateX(contentX: number) {
    const wrapped = ((contentX % CELL_WIDTH) + CELL_WIDTH) % CELL_WIDTH;
    this.background.tilePosition.x = -wrapped;
    this.labels.x = BLEACHER_COLUMN_WIDTH - wrapped;

    const firstVisibleColumn = Math.floor(contentX / CELL_WIDTH);
    if (firstVisibleColumn === this.prevFirstVisibleColumn) return;
    this.prevFirstVisibleColumn = firstVisibleColumn;

    for (let i = 0; i < this.labelPool.length; i++) {
      const col = firstVisibleColumn + i;
      const cell = this.labelPool[i];

      cell.setDateISO(this.dates[col], this.todayISO);
    }
  }
}
