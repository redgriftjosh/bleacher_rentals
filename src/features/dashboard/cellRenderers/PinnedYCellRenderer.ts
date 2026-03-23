import { Application, Container, Graphics, Sprite } from "pixi.js";
import { ICellRenderer } from "../interfaces/ICellRenderer";
import { Baker } from "../util/Baker";
import { EventSpanType, EventsUtil } from "../util/Events";
import { LabelText } from "../ui/event/LabelText";
import { PinnableSection } from "../ui/event/PinnableSection";
import { Bleacher } from "../types";
import { CELL_WIDTH } from "../values/constants";

export class PinnedYCellRenderer implements ICellRenderer {
  private app: Application;
  private baker: Baker;
  private bleachers: Bleacher[];
  private spansByRow: EventSpanType[][];
  private dates: string[];
  private currentScrollX: number = 0;
  private cellWidth: number = 0; // Store the cell width from main grid
  private mainGridFirstVisibleColumn: number = 0; // Track main grid's first visible column
  private minWidthCache: Map<string, number> = new Map(); // Cache min label widths by event name
  private static measureCtx: CanvasRenderingContext2D | null = null;

  constructor(app: Application, bleachers: Bleacher[], dates: string[]) {
    this.app = app;
    this.baker = new Baker(app);
    this.bleachers = bleachers;
    this.dates = dates;

    // Calculate event spans once during construction
    const { spansByRow } = EventsUtil.calculateEventSpans(bleachers, dates);
    this.spansByRow = spansByRow;
  }

  /** Update underlying bleacher array and recompute spans */
  public setData(bleachers: Bleacher[]) {
    this.bleachers = bleachers;
    const { spansByRow } = EventsUtil.calculateEventSpans(bleachers, this.dates);
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
    firstVisibleColumn?: number,
  ): Container {
    // PERFORMANCE CRITICAL: Reuse existing container
    parent.mask = null;
    parent.removeChildren();

    // Use the main grid's first visible column for pinning calculations
    const currentFirstVisibleColumn = this.mainGridFirstVisibleColumn;

    // Find the event that should be pinned for this row (if any)
    const pinnedEventSpan = EventsUtil.findPinnedEventSpan(
      row,
      currentFirstVisibleColumn,
      this.spansByRow,
    );

    if (pinnedEventSpan) {
      // Use exact scrollX for smooth sub-cell-accurate width
      const subCellOffset = this.currentScrollX - currentFirstVisibleColumn * CELL_WIDTH;
      const spanRightEdge =
        (pinnedEventSpan.end - currentFirstVisibleColumn + 1) * CELL_WIDTH - subCellOffset;
      const availableWidth = spanRightEdge - 8; // 8px total padding

      // Calculate minimum width: max(one cell width, longest word)
      const minWrapWidth = Math.max(
        CELL_WIDTH - 8,
        this.getLongestWordWidth(pinnedEventSpan.ev.eventName),
      );

      if (availableWidth >= minWrapWidth) {
        // Pinned mode: label at left edge, wrapping to available width
        const pinnableSection = new PinnableSection(
          pinnedEventSpan,
          this.app,
          this.baker,
          availableWidth,
        );
        parent.addChild(pinnableSection);
      } else {
        // End-unpinned mode: right-justify label against span end, slides off left
        const pinnableSection = new PinnableSection(
          pinnedEventSpan,
          this.app,
          this.baker,
          minWrapWidth,
        );
        // Position so right edge aligns with span's right edge in viewport
        // PinnableSection default x is 4, override to right-justify
        pinnableSection.position.x = spanRightEdge - minWrapWidth - 8;
        parent.addChild(pinnableSection);
      }

      // Mask to clip labels that wrap beyond cell height
      const mask = new Graphics().rect(0, 0, cellWidth, cellHeight).fill(0xffffff);
      parent.addChild(mask);
      parent.mask = mask;

      // const pinnedTexture = this.baker.getTexture(
      //   labelCacheKey,
      //   { width: cellWidth, height: cellHeight },
      //   (container) => {
      //     const pinnableSection = new PinnableSection(pinnedEventSpan, this.app, this.baker);
      //     container.addChild(pinnableSection);
      //   }
      // );

      // const labelSprite = new Sprite(pinnedTexture);
    }
    // If no pinned event, return empty container (transparent)

    return parent;
  }

  /**
   * Get the pixel width of the longest word in an event name.
   * Uses a shared canvas context and caches results.
   */
  private getLongestWordWidth(eventName: string): number {
    const cached = this.minWidthCache.get(eventName);
    if (cached !== undefined) return cached;

    if (!PinnedYCellRenderer.measureCtx) {
      const canvas = document.createElement("canvas");
      PinnedYCellRenderer.measureCtx = canvas.getContext("2d")!;
      PinnedYCellRenderer.measureCtx.font = "500 14px Helvetica";
    }

    const words = eventName.split(/\s+/);
    let maxWidth = 0;
    for (const word of words) {
      const w = PinnedYCellRenderer.measureCtx.measureText(word).width;
      if (w > maxWidth) maxWidth = w;
    }

    this.minWidthCache.set(eventName, maxWidth);
    return maxWidth;
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.baker.destroyAll();
    this.minWidthCache.clear();
  }
}
