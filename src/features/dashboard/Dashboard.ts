import { Application } from "pixi.js";
import { Grid } from "./util/Grid";
import { MainGridCellRenderer } from "./cellRenderers/MainGridCellRenderer";
import { StickyLeftColumnCellRenderer } from "./cellRenderers/StickyLeftColumnCellRenderer";
import { StickyTopRowCellRenderer } from "./cellRenderers/StickyTopRowCellRenderer";
import { PinnedYCellRenderer } from "./cellRenderers/PinnedYCellRenderer";
import { TopLeftCellRenderer } from "./cellRenderers/TopLeftCellRenderer";
import { CellEditor } from "./util/CellEditor";
import { Bleacher, DashboardEvent } from "./types";
import {
  BLEACHER_COLUMN_WIDTH,
  CELL_HEIGHT,
  CELL_WIDTH,
  HEADER_ROW_HEIGHT,
} from "./values/constants";
import { getColumnsAndDates } from "./util/scrollbar";
import { ResizeManager } from "./util/ResizeManager";
import { useDashboardBleachersStore } from "./state/useDashboardBleachersStore";
import { useDashboardEventsStore } from "./state/useDashboardEventsStore";
import { useFilterDashboardStore } from "../dashboardOptions/useFilterDashboardStore";
import { filterEvents, filterSortPixiBleachers } from "../dashboardOptions/util";
import { useCurrentEventStore } from "../eventConfiguration/state/useCurrentEventStore";

export class Dashboard {
  // Grids
  private stickyTopLeftCell!: Grid;
  private stickyTopRow!: Grid;
  private stickyLeftColumn!: Grid;
  private mainGrid!: Grid;
  private mainGridPinnedYAxis!: Grid;

  // Renderers
  private mainGridPinYCellRenderer!: PinnedYCellRenderer; // Store reference for scroll updates
  private mainGridCellRenderer!: MainGridCellRenderer; // Store reference for scroll updates
  private leftColumnCellRenderer!: StickyLeftColumnCellRenderer;
  private topRowCellRenderer!: StickyTopRowCellRenderer;
  private topLeftCellRenderer!: TopLeftCellRenderer;

  // Cell editor
  private cellEditor!: CellEditor;

  // Store app reference for centering calculations
  private app: Application;

  private yAxis: "Bleachers" | "Events";
  private unsubBleachers?: () => void;
  private unsubEvents?: () => void;
  private unsubFilters?: () => void;
  private unsubCurrentEvent?: () => void;
  private bleachers: Bleacher[] = [];
  private events: DashboardEvent[] = [];
  private dates: string[] = [];
  private contentColumns = 0;
  // Track minimal signature of spans per bleacher to detect when recomputation is needed
  // private spanSignaturesByBleacherId: Map<number, string> = new Map();
  // Debounce/coalesce incoming changes
  private recomputeQueued = false;
  // Track and cleanup resize listeners
  // Resize handling via utility
  private resizeManager?: ResizeManager;

  constructor(
    app: Application,
    opts?: {
      initialScrollX?: number | null;
      initialScrollY?: number | null;
    }
  ) {
    this.app = app;
    // Get dates for event calculations
    const { columns: contentColumns, dates } = getColumnsAndDates();
    this.dates = dates;
    this.contentColumns = contentColumns;
    this.yAxis = useFilterDashboardStore.getState().yAxis;

    // Build initial filtered datasets
    const allBleachers = useDashboardBleachersStore.getState().data;
    const allEvents = useDashboardEventsStore.getState().data;
    const filters = useFilterDashboardStore.getState();
    const currentEvent = useCurrentEventStore.getState();
    const selectedIdsForFilter = filters.optimizationMode ? currentEvent.bleacherIds ?? [] : [];
    const filteredBleachers = filterSortPixiBleachers(
      filters.homeBaseIds,
      filters.winterHomeBaseIds,
      filters.rows,
      allBleachers,
      selectedIdsForFilter,
      false,
      filters.optimizationMode,
      filters.season,
      filters.summerAssignedBleacherIds ?? [],
      filters.winterAssignedBleacherIds ?? []
    );
    const filteredEvents =
      this.yAxis === "Events" && filters.stateProvinces.length > 0
        ? filterEvents(allEvents, filters.stateProvinces)
        : allEvents;
    this.bleachers = filteredBleachers;
    this.events = filteredEvents;
    // this.recompute();

    this.initGrids(opts);

    // Initialize ResizeManager to handle resize lifecycle
    this.resizeManager = new ResizeManager(this.app, {
      onStableResize: () => {
        this.rebuildGrids();
      },
      log: false,
    });
    this.resizeManager.start();

    // Unified recompute method
    const computeSpanSignatures = (bleachers: Bleacher[]): Map<number, string> => {
      const map = new Map<number, string>();
      for (const b of bleachers) {
        const sig = (b.bleacherEvents || [])
          .map((ev: any) => `${ev.eventId}:${ev.eventStart}:${ev.eventEnd}`)
          .sort()
          .join("|");
        map.set(b.bleacherId, sig);
      }
      return map;
    };

    const scheduleRecompute = () => {
      if (this.recomputeQueued) return;
      this.recomputeQueued = true;
      requestAnimationFrame(() => {
        this.recomputeQueued = false;
        this.recompute();
      });
    };

    // console.log("is this thing on?");

    // Initialize span signatures for current rows
    // not important until we want to compare with previous state to conditionally re-render things.
    // this.spanSignaturesByBleacherId = computeSpanSignatures(this.bleachers);

    // Subscribe once and coalesce recomputes
    this.unsubFilters = useFilterDashboardStore.subscribe(() => scheduleRecompute());
    this.unsubCurrentEvent = useCurrentEventStore.subscribe(() => scheduleRecompute());
    this.unsubEvents = useDashboardEventsStore.subscribe(() => scheduleRecompute());
    this.unsubBleachers = useDashboardBleachersStore.subscribe(() => scheduleRecompute());

    // Note: initial scroll handling is performed in initGrids using opts
  }

  /**
   * Handle window resize: log new dimensions and relevant grid metrics
   */
  // resize is managed by ResizeManager

  /**
   * Unified recompute: reads all stores, computes filtered data, and applies minimal updates
   */
  private recompute() {
    const filters = useFilterDashboardStore.getState();
    const prevYAxis = this.yAxis;
    this.yAxis = filters.yAxis;

    const allBleachers = useDashboardBleachersStore.getState().data;
    const allEvents = useDashboardEventsStore.getState().data;
    const currentEvent = useCurrentEventStore.getState();
    const selectedIdsForFilter = currentEvent.bleacherIds;

    const filteredBleachers = filterSortPixiBleachers(
      filters.homeBaseIds,
      filters.winterHomeBaseIds,
      filters.rows,
      allBleachers,
      selectedIdsForFilter,
      false,
      filters.optimizationMode,
      filters.season,
      filters.summerAssignedBleacherIds ?? [],
      filters.winterAssignedBleacherIds ?? []
    );
    console.log("filteredBleachers: ", filteredBleachers);
    console.log("filters.optimizationMode: ", filters.optimizationMode);
    const filteredEvents =
      this.yAxis === "Events" && filters.stateProvinces.length > 0
        ? filterEvents(allEvents, filters.stateProvinces)
        : allEvents;

    // Update snapshots
    this.bleachers = filteredBleachers;
    this.events = filteredEvents;
    this.rebuildGrids(); // rebuild grids no matter what for now. Removes any animations for displaying new components.
  }

  /**
   * Initialize renderers and grids based on current bleachers/events/filters
   */
  private initGrids(opts?: { initialScrollX?: number | null; initialScrollY?: number | null }) {
    const app = this.app;
    const dates = this.dates;
    const contentColumns = this.contentColumns;

    this.mainGridCellRenderer = new MainGridCellRenderer(
      app,
      this.bleachers,
      this.events,
      dates,
      this.yAxis,
      undefined
    );
    this.mainGridPinYCellRenderer = new PinnedYCellRenderer(app, this.bleachers, dates);
    this.leftColumnCellRenderer = new StickyLeftColumnCellRenderer(
      app,
      this.bleachers,
      this.yAxis,
      this.events
    );
    this.topRowCellRenderer = new StickyTopRowCellRenderer(app);
    this.topLeftCellRenderer = new TopLeftCellRenderer(app);

    // Calculate viewport dimensions
    const viewportWidth = app.screen.width - BLEACHER_COLUMN_WIDTH;
    const viewportHeight = app.screen.height - HEADER_ROW_HEIGHT;

    const rowsCount = this.yAxis === "Bleachers" ? this.bleachers.length : this.events.length;

    // Top-left: Fixed corner cell (1x1)
    this.stickyTopLeftCell = new Grid({
      app,
      rows: 1,
      cols: 1,
      cellWidth: BLEACHER_COLUMN_WIDTH,
      cellHeight: HEADER_ROW_HEIGHT,
      gridWidth: BLEACHER_COLUMN_WIDTH,
      gridHeight: HEADER_ROW_HEIGHT,
      cellRenderer: this.topLeftCellRenderer,
      x: 0,
      y: 0,
      showScrollbar: false,
    });

    // Top-right: Sticky header row (horizontal scrollable)
    this.stickyTopRow = new Grid({
      app,
      rows: 1,
      cols: contentColumns,
      cellWidth: CELL_WIDTH,
      cellHeight: HEADER_ROW_HEIGHT,
      gridWidth: viewportWidth,
      gridHeight: HEADER_ROW_HEIGHT,
      cellRenderer: this.topRowCellRenderer,
      x: BLEACHER_COLUMN_WIDTH,
      y: 0,
      showScrollbar: false,
    });

    // Bottom-left: Sticky left column (vertical scrollable)
    this.stickyLeftColumn = new Grid({
      app,
      rows: rowsCount,
      cols: 1,
      cellWidth: BLEACHER_COLUMN_WIDTH,
      cellHeight: CELL_HEIGHT,
      gridWidth: BLEACHER_COLUMN_WIDTH,
      gridHeight: viewportHeight,
      cellRenderer: this.leftColumnCellRenderer,
      x: 0,
      y: HEADER_ROW_HEIGHT,
      showScrollbar: false,
    });

    // Bottom-right: Main scrollable content
    this.mainGrid = new Grid({
      app,
      rows: rowsCount,
      cols: contentColumns,
      cellWidth: CELL_WIDTH,
      cellHeight: CELL_HEIGHT,
      gridWidth: viewportWidth,
      gridHeight: viewportHeight,
      cellRenderer: this.mainGridCellRenderer,
      x: BLEACHER_COLUMN_WIDTH,
      y: HEADER_ROW_HEIGHT,
      showScrollbar: true,
      allowScrolling: true,
    });

    // another grid in front of main grid that renders the pinned y axis
    this.mainGridPinnedYAxis = new Grid({
      app,
      rows: rowsCount,
      cols: 1,
      cellWidth: viewportWidth,
      cellHeight: CELL_HEIGHT,
      gridWidth: viewportWidth,
      gridHeight: viewportHeight,
      cellRenderer: this.mainGridPinYCellRenderer,
      x: BLEACHER_COLUMN_WIDTH,
      y: HEADER_ROW_HEIGHT,
      showScrollbar: false,
      onlyUpdateWhenScrollStops: false,
    });

    // When main grid completes a cell update cycle, update the pinned Y axis
    this.mainGrid.on("grid:firstVisibleColIndexChanged", (firstVisibleCol: number) => {
      if (this.yAxis === "Bleachers") {
        this.mainGridPinYCellRenderer.setMainGridFirstVisibleColumn(firstVisibleCol);
        this.mainGridPinnedYAxis.forceUpdate();
      }
    });

    // Add grids in bottom-to-top stacking order
    app.stage.addChild(this.mainGrid);
    if (this.yAxis === "Bleachers") {
      app.stage.addChild(this.mainGridPinnedYAxis);
    }
    app.stage.addChild(this.stickyLeftColumn);
    app.stage.addChild(this.stickyTopRow);
    app.stage.addChild(this.stickyTopLeftCell);

    // Initialize cell editor for the main grid
    this.cellEditor = new CellEditor({
      app,
      grid: this.mainGrid,
      cellWidth: CELL_WIDTH,
      cellHeight: CELL_HEIGHT,
      gridOffsetX: BLEACHER_COLUMN_WIDTH,
      gridOffsetY: HEADER_ROW_HEIGHT,
    });
    this.mainGridCellRenderer.setCellEditor(this.cellEditor);

    // Set up scroll synchronization
    this.setupScrollSynchronization();

    // Apply initial scroll positions if provided
    const hasX = typeof opts?.initialScrollX === "number" && opts.initialScrollX! >= 0;
    const hasY = typeof opts?.initialScrollY === "number" && opts.initialScrollY! >= 0;
    if (hasX) {
      this.mainGrid.setHorizontalScroll(opts!.initialScrollX!);
      this.stickyTopRow.setHorizontalScroll(opts!.initialScrollX!);
      this.mainGrid.updateHorizontalScrollbarPosition(opts!.initialScrollX!);
      this.cellEditor.setScrollPosition(opts!.initialScrollX!, 0);
    } else {
      this.centerHorizontalScroll();
    }
    if (hasY) {
      const contentHeight = this.mainGrid.getContentHeight();
      const viewportHeight = this.mainGrid.getViewportHeight();
      const maxContentY = Math.max(0, contentHeight - viewportHeight);
      const targetY = Math.min(Math.max(opts!.initialScrollY!, 0), maxContentY);
      this.mainGrid.setVerticalScroll(targetY);
      this.stickyLeftColumn.setVerticalScroll(targetY);
      this.mainGridPinnedYAxis.setVerticalScroll(targetY);
      this.mainGrid.updateVerticalScrollbarPosition(targetY);
    }
  }

  /**
   * Tear down and rebuild grids and renderers using latest store-filtered data.
   * Preserves current scroll positions.
   */
  private rebuildGrids() {
    // Preserve scroll positions
    const x = (this.mainGrid as any)?.getCurrentScrollX?.() ?? 0;
    const y = (this.mainGrid as any)?.getCurrentScrollY?.() ?? 0;
    this.teardownGrids();
    this.initGrids({ initialScrollX: x, initialScrollY: y });
  }

  /** Remove grids from stage and destroy them safely */
  private teardownGrids() {
    try {
      this.app.stage.removeChild(this.mainGrid);
    } catch {}
    try {
      this.app.stage.removeChild(this.mainGridPinnedYAxis);
    } catch {}
    try {
      this.app.stage.removeChild(this.stickyLeftColumn);
    } catch {}
    try {
      this.app.stage.removeChild(this.stickyTopRow);
    } catch {}
    try {
      this.app.stage.removeChild(this.stickyTopLeftCell);
    } catch {}

    try {
      this.cellEditor?.destroy();
    } catch {}
    try {
      this.mainGrid?.destroy();
    } catch {}
    try {
      this.mainGridPinnedYAxis?.destroy();
    } catch {}
    try {
      this.stickyLeftColumn?.destroy();
    } catch {}
    try {
      this.stickyTopRow?.destroy();
    } catch {}
    try {
      this.stickyTopLeftCell?.destroy();
    } catch {}

    //   private mainGridPinYCellRenderer!: PinnedYCellRenderer; // Store reference for scroll updates
    // private mainGridCellRenderer!: MainGridCellRenderer; // Store reference for scroll updates
    // private leftColumnCellRenderer!: StickyLeftColumnCellRenderer;
    // private topRowCellRenderer!: StickyTopRowCellRenderer;
    // private topLeftCellRenderer!: TopLeftCellRenderer;
    try {
      this.mainGridPinYCellRenderer.destroy();
    } catch {}
    try {
      this.mainGridCellRenderer.destroy();
    } catch {}
    try {
      this.leftColumnCellRenderer.destroy();
    } catch {}
    try {
      this.topRowCellRenderer.destroy();
    } catch {}
    try {
      this.topLeftCellRenderer.destroy();
    } catch {}
  }

  /**
   * Center the horizontal scroll position on initial load
   * Returns the calculated center position
   */
  private centerHorizontalScroll(): number {
    // Calculate the center position based on content width and viewport width
    const contentWidth = this.mainGrid.getContentWidth();
    const viewportWidth = this.app.screen.width - BLEACHER_COLUMN_WIDTH;

    // Calculate center position (content width / 2 - viewport width / 2)
    const centerX = Math.max(0, (contentWidth - viewportWidth) / 2);

    // console.log(
    //   `Centering horizontal scroll: contentWidth=${contentWidth}, viewportWidth=${viewportWidth}, centerX=${centerX}`
    // );

    // Set the horizontal scroll on ALL grids that need horizontal centering
    this.mainGrid.setHorizontalScroll(centerX);
    this.stickyTopRow.setHorizontalScroll(centerX);

    // Update the scrollbar positions to match (only main grid has visible scrollbar)
    this.mainGrid.updateHorizontalScrollbarPosition(centerX);

    // Update the cell editor with the new scroll position
    this.cellEditor.setScrollPosition(centerX, 0);

    // Return the center position so we can use it for renderer initialization
    return centerX;
  }

  /**
   * Synchronize scrolling between the quadrants
   */
  private setupScrollSynchronization() {
    // When main grid scrolls vertically, sync the left column and pinned Y axis
    this.mainGrid.on("grid:scroll-vertical", (scrollY: number) => {
      this.stickyLeftColumn.setVerticalScroll(scrollY);
      this.mainGridPinnedYAxis.setVerticalScroll(scrollY);
    });

    // When main grid scrolls horizontally, sync the top row and update both renderers
    this.mainGrid.on("grid:scroll-horizontal", (scrollX: number) => {
      this.stickyTopRow.setHorizontalScroll(scrollX);

      // Update both renderers with current scroll position
      this.mainGridPinYCellRenderer.updateScrollPosition(scrollX, CELL_WIDTH);
      this.mainGridCellRenderer.updateScrollPosition(scrollX, CELL_WIDTH);
    });

    // Horizontal centering moved to constructor after potential initialScrollX check
  }

  /** Current scroll positions (content px) */
  public getScrollPositions(): { x: number; y: number } {
    const x = (this.mainGrid as any)?.getCurrentScrollX?.() ?? 0;
    const y = (this.mainGrid as any)?.getCurrentScrollY?.() ?? 0;
    return { x, y };
  }

  /**
   * Clean up resources
   */
  destroy() {
    try {
      this.resizeManager?.destroy();
    } catch {}
    try {
      this.unsubCurrentEvent?.();
    } catch {}
    try {
      this.unsubBleachers?.();
    } catch {}
    try {
      this.unsubEvents?.();
    } catch {}
    try {
      this.unsubFilters?.();
    } catch {}
    this.cellEditor.destroy();
    this.stickyTopLeftCell.destroy();
    this.stickyTopRow.destroy();
    this.stickyLeftColumn.destroy();
    this.mainGridPinnedYAxis.destroy();
    this.mainGrid.destroy();
  }
}
