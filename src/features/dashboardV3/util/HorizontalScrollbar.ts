import { Application, Container, FederatedWheelEvent, Graphics, Point } from "pixi.js";

export const HORIZONTAL_SCROLLBAR_THICKNESS = 14;
const HORIZONTAL_THUMB_THICKNESS = 10;
const HORIZONTAL_THUMB_LENGTH = 40;

/**
 * Simple horizontal scrollbar for DashboardV3
 * Handles wheel events and thumb dragging, emits scroll events to grid
 */
export class HorizontalScrollbar {
  private app: Application;
  private grid: Container; // Grid container to emit events to
  private thumb?: Graphics;
  private scrollbarContainer?: Container;
  private contentX: number = 0; // Current scroll position in content pixels
  private thumbX: number = 0; // Current thumb position in track pixels
  private dragging = false;
  private offset = new Point();

  // Scroll bounds
  private maxThumbX: number; // Maximum thumb position
  private maxContentX: number; // Maximum content scroll

  constructor(
    app: Application,
    contentWidth: number,
    viewportWidth: number,
    grid: Container,
    hasVerticalScrollbar: boolean = false
  ) {
    this.app = app;
    this.grid = grid;

    // Calculate scroll bounds, accounting for vertical scrollbar if present
    const availableWidth = hasVerticalScrollbar ? app.screen.width - 14 : app.screen.width; // 14 = SCROLLBAR_THICKNESS
    this.maxContentX = Math.max(0, contentWidth - viewportWidth);
    this.maxThumbX = Math.max(0, availableWidth - HORIZONTAL_THUMB_LENGTH);

    // Only create scrollbar if content is larger than viewport
    if (this.maxContentX > 0) {
      this.createScrollbar(hasVerticalScrollbar);
      this.setupEvents();
    }
  }

  private createScrollbar(hasVerticalScrollbar: boolean = false) {
    this.scrollbarContainer = new Container();
    this.scrollbarContainer.position.set(
      0,
      this.app.screen.height - HORIZONTAL_SCROLLBAR_THICKNESS
    );

    // Calculate track width, leaving space for vertical scrollbar if present
    const trackWidth = hasVerticalScrollbar ? this.app.screen.width - 14 : this.app.screen.width; // 14 = SCROLLBAR_THICKNESS

    // Scrollbar track (background) - make it more visible
    const track = new Graphics()
      .rect(0, 0, trackWidth, HORIZONTAL_SCROLLBAR_THICKNESS)
      .fill({ color: 0x000000, alpha: 0.1 });
    this.scrollbarContainer.addChild(track);

    // Scrollbar thumb (draggable part) - make it more visible with pill shape
    this.thumb = new Graphics()
      .roundRect(
        0,
        2,
        HORIZONTAL_THUMB_LENGTH,
        HORIZONTAL_THUMB_THICKNESS,
        HORIZONTAL_THUMB_THICKNESS / 2
      )
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
      this.offset.set(localPoint.x - this.thumb.x, 0);

      this.app.stage.on("pointermove", this.onDrag);
      this.app.stage.on("pointerup", this.onDragEnd);
      this.app.stage.on("pointerupoutside", this.onDragEnd);
    });

    // Note: Wheel events will be handled by Grid to coordinate between scrollbars
  }

  private onDrag = (e: any) => {
    if (!this.dragging || !this.thumb || !this.thumb.parent) return;

    const localPoint = this.thumb.parent.toLocal(e.global);
    const newThumbX = this.clamp(localPoint.x - this.offset.x, 0, this.maxThumbX);

    // Convert thumb position to content position
    const newContentX = this.maxContentX > 0 ? (newThumbX / this.maxThumbX) * this.maxContentX : 0;
    this.setScrollPosition(newContentX);
  };

  private onDragEnd = () => {
    this.dragging = false;
    this.app.stage.off("pointermove", this.onDrag);
    this.app.stage.off("pointerup", this.onDragEnd);
    this.app.stage.off("pointerupoutside", this.onDragEnd);
  };

  private onWheel = (e: FederatedWheelEvent) => {
    // Only handle horizontal wheel events or shift+wheel
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      let deltaX = e.shiftKey ? e.deltaY : e.deltaX; // Use deltaY when shift is pressed

      // Normalize delta based on mode
      if (e.deltaMode === 1) deltaX *= 16; // Lines to pixels
      else if (e.deltaMode === 2) deltaX *= 100; // Pages to pixels

      const newContentX = this.contentX + deltaX;
      this.setScrollPosition(newContentX);

      e.preventDefault();
    }
  };

  /**
   * Handle wheel events from Grid coordinator
   */
  public handleWheel(deltaX: number) {
    const newContentX = this.contentX + deltaX;
    this.setScrollPosition(newContentX);
  }

  private setScrollPosition(newContentX: number) {
    // Clamp content position
    this.contentX = this.clamp(newContentX, 0, this.maxContentX);

    // Update thumb position
    this.thumbX = this.maxContentX > 0 ? (this.contentX / this.maxContentX) * this.maxThumbX : 0;

    if (this.thumb) {
      this.thumb.position.x = Math.round(this.thumbX);
    }

    // Emit scroll event for Grid to listen to
    this.grid.emit("grid:scroll-horizontal", this.contentX);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  public getScrollPosition(): number {
    return this.contentX;
  }

  public destroy() {
    // Note: No wheel event to remove since Grid handles wheel events
    if (this.scrollbarContainer) {
      this.app.stage.removeChild(this.scrollbarContainer);
      this.scrollbarContainer.destroy({ children: true });
    }
  }
}
