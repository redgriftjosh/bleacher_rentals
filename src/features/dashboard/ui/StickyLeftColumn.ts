import { Application, Container, Graphics, Sprite, TilingSprite } from "pixi.js";
import { Tile } from "./Tile";
import { BLEACHER_COLUMN_WIDTH, CELL_HEIGHT, HEADER_ROW_HEIGHT } from "../values/constants";
// import { BleacherCell } from "./BleacherCell";
import { Bleacher } from "../db/client/bleachers";
import { MicroProfiler } from "../util/MicroProfiler";
// import { BakedBleacherCell } from "./BleacherCell";
import { Baker } from "../util/Baker";
import { BleacherCell } from "./BleacherCell";
import { useCurrentEventStore } from "@/app/(dashboards)/bleachers-dashboard/_lib/useCurrentEventStore";

export class StickyLeftColumn extends Container {
  private background: TilingSprite;
  private labels: Container;
  private prevFirstVisibleRow = -1;
  // private labelPool: BleacherCell[] = [];
  private bleachers: Bleacher[];

  private labelPool: BleacherCell[] = [];
  private bleacherCellBaker: Baker;

  private unsub?: () => void;
  private lastExpanded = false;
  private lastIds: number[] = [];

  constructor(app: Application, gridHeight: number, bleachers: Bleacher[], visibleRows: number) {
    super();
    this.bleachers = bleachers;

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
    // this.background.addChild(stickyLeftColumnMask);
    this.background.mask = stickyLeftColumnMask;

    // create the container for the labels
    this.labels = new Container();
    this.labels.position.set(0, CELL_HEIGHT);
    this.labels.mask = stickyLeftColumnMask;

    for (let i = 0; i < visibleRows; i++) {
      const cell = new BleacherCell(this.bleacherCellBaker);
      cell.x = 0;
      cell.y = i * CELL_HEIGHT;

      // toggle handler uses the store (like your React code)
      cell.setToggleHandler((id) => {
        const st = useCurrentEventStore.getState();
        if (!st.isFormExpanded) return;
        const selected = st.bleacherIds;
        const updated = selected.includes(id)
          ? selected.filter((n) => n !== id)
          : [...selected, id];
        st.setField("bleacherIds", updated);
      });

      this.labels.addChild(cell);
      this.labelPool.push(cell);
    }

    this.addChild(this.background, stickyLeftColumnMask, this.labels);
    this.mask = stickyLeftColumnMask;

    // initial bind
    this.updateY(0);
    this.subscribeToStateChanges(app);
  }

  // private subscribeToStateChanges() {
  //   const isFormExpanded = useCurrentEventStore.getState().isFormExpanded;
  //   for (const cell of this.labelPool) cell.setFormExpanded(isFormExpanded);
  //   let last = isFormExpanded;

  //   // …and subscribe once to keep them in sync:
  //   const unsub = useCurrentEventStore.subscribe((s) => {
  //     if (s.isFormExpanded !== last) {
  //       last = s.isFormExpanded;
  //       for (const cell of this.labelPool) cell.setFormExpanded(last);
  //     }
  //   });
  // }

  private subscribeToStateChanges(app: Application) {
    // seed
    const st = useCurrentEventStore.getState();
    this.lastExpanded = !!st.isFormExpanded;
    this.lastIds = st.bleacherIds.slice();
    for (const cell of this.labelPool) cell.setFormExpanded(this.lastExpanded);
    this.applySelectionToVisible();

    this.unsub = useCurrentEventStore.subscribe((s) => {
      const changedExpanded = s.isFormExpanded !== this.lastExpanded;
      const changedIds = s.bleacherIds !== this.lastIds;

      if (!changedExpanded && !changedIds) return;

      if (changedExpanded) this.lastExpanded = s.isFormExpanded;
      if (changedIds) this.lastIds = s.bleacherIds;

      app.ticker.addOnce(() => {
        if (changedExpanded) {
          for (const cell of this.labelPool) cell.setFormExpanded(this.lastExpanded);
        }
        if (changedIds) this.applySelectionToVisible();
      });
    });
  }

  private applySelectionToVisible() {
    const first = this.prevFirstVisibleRow < 0 ? 0 : this.prevFirstVisibleRow;
    for (let i = 0; i < this.labelPool.length; i++) {
      const row = first + i;
      const cell = this.labelPool[i];
      if (row < 0 || row >= this.bleachers.length) {
        cell.visible = false;
        continue;
      }
      cell.visible = true;
      const b = this.bleachers[row];
      cell.setSelected(this.lastIds.includes(b.bleacherId));
    }
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

    for (let i = 0; i < this.labelPool.length; i++) {
      const row = firstVisibleRow + i;
      const cell = this.labelPool[i];

      if (row < 0 || row >= rows) {
        if (cell.visible) cell.visible = false;
        continue;
      }

      if (!cell.visible) cell.visible = true;
      cell.setBleacher(this.bleachers[row]);
      cell.setFormExpanded(this.lastExpanded);
      cell.setSelected(this.lastIds.includes(this.bleachers[row].bleacherId));
    }
  }

  /** Ensure we unsubscribe when PIXI destroys the node (e.g., route change). */
  override destroy(options?: any) {
    try {
      this.unsub?.();
    } catch {}
    this.unsub = undefined;
    super.destroy(options);
  }
}
