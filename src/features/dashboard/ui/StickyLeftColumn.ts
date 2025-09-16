import { Application, Container, Graphics, Sprite, TilingSprite } from "pixi.js";
import { Tile } from "./Tile";
import { BLEACHER_COLUMN_WIDTH, CELL_HEIGHT, HEADER_ROW_HEIGHT } from "../values/constants";
// import { BleacherCell } from "./BleacherCell";
import { Bleacher } from "../db/client/bleachers";
import { MicroProfiler } from "../util/MicroProfiler";
// import { BakedBleacherCell } from "./BleacherCell";
import { Baker } from "../util/Baker";
import { BleacherCell } from "./BleacherCell";

export class StickyLeftColumn extends Container {
  private background: TilingSprite;
  private labels: Container;
  private prevFirstVisibleRow = -1;
  // private labelPool: BleacherCell[] = [];
  private bleachers: Bleacher[];
  private profiler?: MicroProfiler;

  private labelPool: BleacherCell[] = [];
  private bleacherCellBaker: Baker;

  constructor(
    app: Application,
    gridHeight: number,
    bleachers: Bleacher[],
    visibleRows: number,
    profiler?: MicroProfiler
  ) {
    super();
    this.bleachers = bleachers;
    this.profiler = profiler;

    this.bleacherCellBaker = new Baker(app);

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
      const cell = new BleacherCell(this.bleacherCellBaker);
      cell.x = 0;
      cell.y = i * CELL_HEIGHT;
      cell.eventMode = "none";
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

    const rows = this.bleachers.length;

    const firstVisibleRow = Math.floor(contentY / CELL_HEIGHT);
    if (firstVisibleRow === this.prevFirstVisibleRow) return;
    this.prevFirstVisibleRow = firstVisibleRow;

    this.profiler?.pf("stickyLeft.rebindRows", () => {
      let hidden = 0;
      let shown = 0;
      let textSet = 0;

      for (let i = 0; i < this.labelPool.length; i++) {
        const row = firstVisibleRow + i;
        const cell = this.labelPool[i];

        if (row < 0 || row >= rows) {
          if (cell.visible) hidden++;
          cell.visible = false;
          continue;
        }

        if (!cell.visible) shown++;
        cell.visible = true;
        cell.setBleacher(this.bleachers[row]);
        textSet++;
      }
      this.profiler?.count("left.hidden", hidden);
      this.profiler?.count("left.shown", shown);
      this.profiler?.count("left.setText", textSet);
    });
  }
}
