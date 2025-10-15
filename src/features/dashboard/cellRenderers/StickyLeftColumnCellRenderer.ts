import { Application, Container } from "pixi.js";
import { ICellRenderer } from "../interfaces/ICellRenderer";
import { BleacherCell } from "../ui/BleacherCell";
import { Tile } from "../ui/Tile";
import { Baker } from "../util/Baker";
import { EventLeftColumnCell } from "../ui/EventLeftColumnCell";
import { Bleacher, DashboardEvent } from "../types";
import { useCurrentEventStore } from "@/features/eventConfiguration/state/useCurrentEventStore";

/**
 * CellRenderer for the sticky left column that displays bleacher information
 * Uses BleacherCell component to show bleacher details in each row
 *
 * This renderer creates BleacherCell instances that display real bleacher data
 * The Grid handles automatic baking and caching for performance
 */
export class StickyLeftColumnCellRenderer implements ICellRenderer {
  private app: Application;
  private baker: Baker;
  private bleachers: Bleacher[];

  // Maintain a pool keyed by row index so per-row toggle state can persist across rebuilds
  private cellPool: Map<number, BleacherCell> = new Map();
  private unsub?: () => void;
  private isFormExpanded = false;
  private selectedBleacherIds: number[] = [];

  private yAxis: "Bleachers" | "Events" = "Bleachers";
  private events: DashboardEvent[];

  constructor(
    app: Application,
    bleachers: Bleacher[],
    yAxis: "Bleachers" | "Events",
    events: DashboardEvent[]
  ) {
    this.app = app;
    this.baker = new Baker(app);
    this.bleachers = bleachers;
    this.yAxis = yAxis;
    this.events = events;
    this.bootstrapStateSync();
  }

  private bootstrapStateSync() {
    const st = useCurrentEventStore.getState();
    this.isFormExpanded = !!st.isFormExpanded;
    this.selectedBleacherIds = st.bleacherIds.slice();
    this.unsub = useCurrentEventStore.subscribe((s) => {
      const expandedChanged = s.isFormExpanded !== this.isFormExpanded;
      const selectedChanged = s.bleacherIds !== this.selectedBleacherIds;
      if (!expandedChanged && !selectedChanged) return;
      if (expandedChanged) this.isFormExpanded = s.isFormExpanded;
      if (selectedChanged) this.selectedBleacherIds = s.bleacherIds.slice();

      // Defer UI updates to next tick to avoid mid-build churn
      const ticker = (this.app as any)?.ticker;
      if (ticker && typeof ticker.addOnce === "function") {
        ticker.addOnce(() => {
          for (const [row, cell] of this.cellPool.entries()) {
            if (expandedChanged) cell.setFormExpanded(this.isFormExpanded);
            if (selectedChanged) {
              const b = this.bleachers[row];
              if (b) cell.setSelected(this.selectedBleacherIds.includes(b.bleacherId));
            }
          }
        });
      } else {
        // Fallback: update immediately if ticker missing (likely during teardown)
        for (const [row, cell] of this.cellPool.entries()) {
          if (expandedChanged) cell.setFormExpanded(this.isFormExpanded);
          if (selectedChanged) {
            const b = this.bleachers[row];
            if (b) cell.setSelected(this.selectedBleacherIds.includes(b.bleacherId));
          }
        }
      }
    });
  }

  private getOrCreateCell(row: number): BleacherCell {
    let cell = this.cellPool.get(row);
    if (!cell) {
      cell = new BleacherCell(this.baker);
      const bleacher = this.bleachers[row];
      if (bleacher) cell.setBleacher(bleacher);

      // Wire toggle handler
      cell.setToggleHandler((id) => {
        const st = useCurrentEventStore.getState();
        if (!st.isFormExpanded) return;
        const selected = st.bleacherIds;
        const updated = selected.includes(id)
          ? selected.filter((n) => n !== id)
          : [...selected, id];
        st.setField("bleacherIds", updated);
      });

      // Initial state application
      cell.setFormExpanded(this.isFormExpanded);
      if (bleacher) cell.setSelected(this.selectedBleacherIds.includes(bleacher.bleacherId));
      this.cellPool.set(row, cell);
    }
    return cell;
  }

  /**
   * Build cell content using BleacherCell component
   * This creates the actual visual content that will be baked into a texture by Grid
   */
  buildCell(
    row: number,
    col: number,
    cellWidth: number,
    cellHeight: number,
    parent: Container
  ): Container {
    parent.removeChildren();

    const dimensions = { width: cellWidth, height: cellHeight };
    if (this.yAxis === "Events") {
      const event = this.events[row];
      if (event) {
        const cell = new EventLeftColumnCell(dimensions, this.baker, event);
        parent.addChild(cell);
        return parent;
      }
    }

    const tileSprite = new Tile(dimensions, this.baker, row, col);
    parent.addChild(tileSprite);

    const bleacher = this.bleachers[row];
    if (bleacher) {
      const cell = this.getOrCreateCell(row);
      // Ensure bleacher data is up to date (in case data changed externally)
      cell.setBleacher(bleacher);
      parent.addChild(cell);
    }
    return parent;
  }

  /**
   * Clean up resources
   */
  destroy() {
    try {
      this.unsub?.();
    } catch {}
    this.unsub = undefined;
    this.cellPool.clear();
    this.baker.destroyAll();
  }
}
