import { Application, Container, Graphics, TilingSprite } from "pixi.js";
import { Tile } from "./Tile";
import { BLEACHER_COLUMN_WIDTH, CELL_HEIGHT, HEADER_ROW_HEIGHT } from "../values/constants";
import { BleacherCell } from "./BleacherCell";
import { Bleacher } from "../db/client/bleachers";

export class StickyLeftColumn extends Container {
  private background: TilingSprite;
  private labels: Container;
  private prevFirstVisibleRow = -1;
  private labelPool: BleacherCell[] = [];
  private bleachers: Bleacher[];

  constructor(app: Application, gridHeight: number, bleachers: Bleacher[], visibleRows: number) {
    super();
    this.bleachers = bleachers;
    // create bleacher tile or cell with the right dimensions
    const bleacherTile = new Tile(app, { width: BLEACHER_COLUMN_WIDTH, height: CELL_HEIGHT })
      .texture;

    // create the tiling sprite for the sticky left column
    this.background = new TilingSprite({
      texture: bleacherTile,
      height: gridHeight - HEADER_ROW_HEIGHT,
      position: { x: 0, y: HEADER_ROW_HEIGHT },
    });

    // create the mask for the sticky left column so labels don't overflow
    const stickyLeftColumnMask = new Graphics()
      .rect(0, HEADER_ROW_HEIGHT, BLEACHER_COLUMN_WIDTH, gridHeight - HEADER_ROW_HEIGHT)
      .fill(0xffffff);
    this.background.addChild(stickyLeftColumnMask);
    this.background.mask = stickyLeftColumnMask;

    // create the container for the labels
    this.labels = new Container();
    this.labels.position.set(0, CELL_HEIGHT);
    this.labels.mask = stickyLeftColumnMask;

    for (let i = 0; i < visibleRows; i++) {
      const cell = new BleacherCell();
      cell.x = 0;
      cell.y = i * CELL_HEIGHT;
      this.labels.addChild(cell);
      this.labelPool.push(cell);
    }

    this.addChild(this.background, stickyLeftColumnMask, this.labels);
    this.mask = stickyLeftColumnMask;

    // initial bind
    this.updateY(0);
  }

  /** Call every time vertical content scroll changes (in pixels). */
  updateY(contentY: number) {
    const wrapped = ((contentY % CELL_HEIGHT) + CELL_HEIGHT) % CELL_HEIGHT;

    this.background.tilePosition.y = -wrapped;
    this.labels.y = HEADER_ROW_HEIGHT - wrapped;

    // clamp the first visible row so the last pooled cell still points to a real row
    // const rawFirst = Math.floor(contentY / CELL_HEIGHT);
    // const maxStart = Math.max(0, rows - this.labelPool.length);
    // const firstVisibleRow = Math.min(Math.max(0, rawFirst), maxStart);

    const rows = this.bleachers.length;

    const firstVisibleRow = Math.floor(contentY / CELL_HEIGHT);
    if (firstVisibleRow === this.prevFirstVisibleRow) return;
    this.prevFirstVisibleRow = firstVisibleRow;

    for (let i = 0; i < this.labelPool.length; i++) {
      const row = firstVisibleRow + i;
      const cell = this.labelPool[i];
      if (row < 0 || row >= rows) {
        cell.visible = false;
        continue;
      }
      cell.visible = true;
      cell.setText(
        this.bleachers[row].bleacherNumber,
        this.bleachers[row].bleacherRows,
        this.bleachers[row].bleacherSeats,
        this.bleachers[row].summerHomeBase,
        this.bleachers[row].winterHomeBase
      );
    }
  }
}
