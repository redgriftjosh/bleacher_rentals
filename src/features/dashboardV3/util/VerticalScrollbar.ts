import { Application, Container, FederatedWheelEvent, Graphics, Point } from "pixi.js";

export const SCROLLBAR_THICKNESS = 14;
const THUMB_THICKNESS = 10;
const THUMB_LENGTH = 40;

/**
 * Simple vertical scrollbar for DashboardV3
 * Handles wheel events and thumb dragging, emits scroll events to grid
 */
export class VerticalScrollbar {
  private app: Application;
  private grid: Container; // Grid container to emit events to
  private thumb?: Graphics;
  private scrollbarContainer?: Container;
  private contentY: number = 0; // Current scroll position in content pixels
  private thumbY: number = 0; // Current thumb position in track pixels
  private dragging = false;
  private offset = new Point();

  // Scroll bounds
  private maxThumbY: number; // Maximum thumb position
  private maxContentY: number; // Maximum content scroll

  constructor(
    app: Application,
    contentHeight: number,
    viewportHeight: number,
    grid: Container,
    hasHorizontalScrollbar: boolean = false,
    gridX: number = 0,
    gridY: number = 0,
    gridWidth: number = app.screen.width,
    gridHeight: number = app.screen.height,
    showScrollbar: boolean = true
  ) {
    this.app = app;
    this.grid = grid;

    // Calculate scroll bounds, accounting for horizontal scrollbar if present
    const availableHeight = hasHorizontalScrollbar ? gridHeight - 14 : gridHeight; // 14 = HORIZONTAL_SCROLLBAR_THICKNESS
    this.maxContentY = Math.max(0, contentHeight - viewportHeight);
    this.maxThumbY = Math.max(0, availableHeight - THUMB_LENGTH);

    // Only create scrollbar if content is larger than viewport
    if (this.maxContentY > 0) {
      // Only create visual scrollbar if showScrollbar is true
      if (showScrollbar) {
        this.createScrollbar(hasHorizontalScrollbar, gridX, gridY, gridWidth, gridHeight);
      }
      this.setupEvents();
    }
  }
  private createScrollbar(
    hasHorizontalScrollbar: boolean = false,
    gridX: number = 0,
    gridY: number = 0,
    gridWidth: number = this.app.screen.width,
    gridHeight: number = this.app.screen.height
  ) {
    this.scrollbarContainer = new Container();
    // Position scrollbar at the right edge of the grid
    this.scrollbarContainer.position.set(gridX + gridWidth - SCROLLBAR_THICKNESS, gridY);

    // Calculate track height, leaving space for horizontal scrollbar if present
    const trackHeight = hasHorizontalScrollbar ? gridHeight - 14 : gridHeight; // 14 = HORIZONTAL_SCROLLBAR_THICKNESS

    // Scrollbar track (background) - make it more visible
    const track = new Graphics()
      .rect(0, 0, SCROLLBAR_THICKNESS, trackHeight)
      .fill({ color: 0x000000, alpha: 0.1 });
    this.scrollbarContainer.addChild(track);

    // Scrollbar thumb (draggable part) - make it more visible with pill shape
    this.thumb = new Graphics()
      .roundRect(2, 0, THUMB_THICKNESS, THUMB_LENGTH, THUMB_THICKNESS / 2)
      .fill({ color: 0x666666, alpha: 0.4 });
    this.thumb.eventMode = "static";
    this.scrollbarContainer.addChild(this.thumb);

    this.app.stage.addChild(this.scrollbarContainer);
  }

  private setupEvents() {
    if (!this.thumb) return;

    // Set up stage for events
    this.app.stage.eventMode = "static";
    this.app.stage.hitArea = this.app.screen;

    // Thumb dragging
    this.thumb.on("pointerdown", (e) => {
      this.dragging = true;
      if (!this.thumb || !this.thumb.parent) return;

      const localPoint = this.thumb.parent.toLocal(e.global);
      this.offset.set(0, localPoint.y - this.thumb.y);

      this.app.stage.on("pointermove", this.onDrag);
      this.app.stage.on("pointerup", this.onDragEnd);
      this.app.stage.on("pointerupoutside", this.onDragEnd);
    });

    // Note: Wheel events will be handled by Grid to coordinate between scrollbars
  }

  private onDrag = (e: any) => {
    if (!this.dragging || !this.thumb || !this.thumb.parent) return;

    const localPoint = this.thumb.parent.toLocal(e.global);
    const newThumbY = this.clamp(localPoint.y - this.offset.y, 0, this.maxThumbY);

    // Convert thumb position to content position
    const newContentY = this.maxContentY > 0 ? (newThumbY / this.maxThumbY) * this.maxContentY : 0;
    this.setScrollPosition(newContentY);
  };

  private onDragEnd = () => {
    this.dragging = false;
    this.app.stage.off("pointermove", this.onDrag);
    this.app.stage.off("pointerup", this.onDragEnd);
    this.app.stage.off("pointerupoutside", this.onDragEnd);
  };

  private onWheel = (e: FederatedWheelEvent) => {
    // Only handle vertical wheel events (not shift+wheel or predominantly horizontal)
    if (!e.shiftKey && Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
      let deltaY = e.deltaY;

      // Normalize delta based on mode
      if (e.deltaMode === 1) deltaY *= 16; // Lines to pixels
      else if (e.deltaMode === 2) deltaY *= 100; // Pages to pixels

      const newContentY = this.contentY + deltaY;
      this.setScrollPosition(newContentY);

      e.preventDefault();
    }
  };

  /**
   * Handle wheel events from Grid coordinator
   */
  public handleWheel(deltaY: number) {
    const newContentY = this.contentY + deltaY;
    this.setScrollPosition(newContentY);
  }

  private setScrollPosition(newContentY: number) {
    // Clamp content position
    this.contentY = this.clamp(newContentY, 0, this.maxContentY);

    // Update thumb position
    this.thumbY = this.maxContentY > 0 ? (this.contentY / this.maxContentY) * this.maxThumbY : 0;

    if (this.thumb) {
      this.thumb.position.y = Math.round(this.thumbY);
    }

    // Emit scroll event for Grid to listen to
    this.grid.emit("grid:scroll", this.contentY);
  }
  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  public getScrollPosition(): number {
    return this.contentY;
  }

  public destroy() {
    // Note: No wheel event to remove since Grid handles wheel events
    if (this.scrollbarContainer) {
      this.app.stage.removeChild(this.scrollbarContainer);
      this.scrollbarContainer.destroy({ children: true });
    }
  }
}
