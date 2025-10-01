import { Application, Container, FederatedWheelEvent, Graphics, Point } from "pixi.js";

const SCROLLBAR_THICKNESS = 20;
const THUMB_THICKNESS = 16;
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

  constructor(app: Application, contentHeight: number, viewportHeight: number, grid: Container) {
    this.app = app;
    this.grid = grid;

    // Calculate scroll bounds
    this.maxContentY = Math.max(0, contentHeight - viewportHeight);
    this.maxThumbY = Math.max(0, app.screen.height - THUMB_LENGTH);

    // Only create scrollbar if content is larger than viewport
    if (this.maxContentY > 0) {
      this.createScrollbar();
      this.setupEvents();
    }
  }
  private createScrollbar() {
    this.scrollbarContainer = new Container();
    this.scrollbarContainer.position.set(this.app.screen.width - SCROLLBAR_THICKNESS, 0);

    // Scrollbar track (background)
    const track = new Graphics()
      .rect(0, 0, SCROLLBAR_THICKNESS, this.app.screen.height)
      .fill({ color: 0x000000, alpha: 0.1 });
    this.scrollbarContainer.addChild(track);

    // Scrollbar thumb (draggable part)
    this.thumb = new Graphics()
      .rect(2, 0, THUMB_THICKNESS, THUMB_LENGTH)
      .fill({ color: 0x000000, alpha: 0.3 });
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

    // Mouse wheel scrolling
    this.app.stage.on("wheel", this.onWheel);
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
    let deltaY = e.deltaY;

    // Normalize delta based on mode
    if (e.deltaMode === 1) deltaY *= 16; // Lines to pixels
    else if (e.deltaMode === 2) deltaY *= 100; // Pages to pixels

    const newContentY = this.contentY + deltaY;
    this.setScrollPosition(newContentY);

    e.preventDefault();
  };

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
    if (this.thumb) {
      this.app.stage.off("wheel", this.onWheel);
    }
    if (this.scrollbarContainer) {
      this.app.stage.removeChild(this.scrollbarContainer);
      this.scrollbarContainer.destroy({ children: true });
    }
  }
}
