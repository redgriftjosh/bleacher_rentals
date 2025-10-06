import { Application, Container, Sprite } from "pixi.js";
import { ICellRenderer } from "../interfaces/ICellRenderer";
import { Baker } from "../util/Baker";
import { Bleacher } from "../../dashboard/db/client/bleachers";
import { EventSpanType, EventsUtil } from "../util/Events";
import { LabelText } from "../ui/event/LabelText";
import { PinnableSection } from "../ui/event/PinnableSection";

export class PinnedYCellRenderer implements ICellRenderer {
  private app: Application;
  private baker: Baker;
  private bleachers: Bleacher[];
  private spansByRow: EventSpanType[][];
  private dates: string[];
  private currentScrollX: number = 0;
  private cellWidth: number = 0; // Store the cell width from main grid
  private mainGridFirstVisibleColumn: number = 0; // Track main grid's first visible column

  constructor(app: Application, bleachers: Bleacher[], dates: string[]) {
    this.app = app;
    this.baker = new Baker(app);
    this.bleachers = bleachers;
    this.dates = dates;

    // Calculate event spans once during construction
    const { spansByRow } = EventsUtil.calculateEventSpans(bleachers, dates);
    this.spansByRow = spansByRow;
  }

  /**
   * Update the current scroll position and cell width from the main grid
   * This should be called whenever the main grid scrolls horizontally
   */
  updateScrollPosition(scrollX: number, mainGridCellWidth: number) {
    this.currentScrollX = scrollX;
    this.cellWidth = mainGridCellWidth;
  }

  /**
   * Update the main grid's first visible column for pinning calculations
   */
  public setMainGridFirstVisibleColumn(firstVisibleColumn: number) {
    this.mainGridFirstVisibleColumn = firstVisibleColumn;
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
    parent: Container,
    firstVisibleColumn?: number
  ): Container {
    // PERFORMANCE CRITICAL: Reuse existing container
    parent.removeChildren();

    // Use the main grid's first visible column for pinning calculations
    const currentFirstVisibleColumn = this.mainGridFirstVisibleColumn;

    // Find the event that should be pinned for this row (if any)
    const pinnedEventSpan = EventsUtil.findPinnedEventSpan(
      row,
      currentFirstVisibleColumn,
      this.spansByRow
    );

    if (pinnedEventSpan) {
      // Cache the static label
      const labelCacheKey = `PinnableSection:${pinnedEventSpan.ev.eventId}`;
      const pinnableSection = new PinnableSection(pinnedEventSpan, this.app, this.baker);
      // const pinnedTexture = this.baker.getTexture(
      //   labelCacheKey,
      //   { width: cellWidth, height: cellHeight },
      //   (container) => {
      //     const pinnableSection = new PinnableSection(pinnedEventSpan, this.app, this.baker);
      //     container.addChild(pinnableSection);
      //   }
      // );

      // const labelSprite = new Sprite(pinnedTexture);
      parent.addChild(pinnableSection);
    }
    // If no pinned event, return empty container (transparent)

    return parent;
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.baker.destroyAll();
  }
}
