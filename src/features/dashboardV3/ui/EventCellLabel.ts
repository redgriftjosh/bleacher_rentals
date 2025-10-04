import { Container, Text, Graphics, Application } from "pixi.js";
import { EventSpanType } from "../util/Events";
import { StaticEventLabel } from "./StaticEventLabel";
import { AnimatedTriangle } from "./AnimatedTriangle";

export type EventLabelRenderMode = "static" | "dynamic" | "separated";

/**
 * Event cell label that can render in different modes for optimal caching
 * - static: Just text, can be fully baked
 * - dynamic: Text + static triangle, can be baked as unit
 * - separated: Text baked separately, triangle rendered live for animation
 */
export class EventCellLabel extends Container {
  private renderMode: EventLabelRenderMode;
  private staticLabel: StaticEventLabel;
  private triangle?: AnimatedTriangle;

  constructor(
    eventInfo: EventSpanType,
    firstVisibleColIndex: number,
    currentColIndex: number,
    app: Application,
    renderMode: EventLabelRenderMode = "dynamic"
  ) {
    super();
    this.renderMode = renderMode;

    // Always create the static label
    this.staticLabel = new StaticEventLabel(eventInfo, firstVisibleColIndex, currentColIndex);
    this.addChild(this.staticLabel);

    // Add triangle based on render mode
    if (renderMode === "dynamic" || renderMode === "separated") {
      this.addTriangle(app);
    }
  }

  private addTriangle(app: Application) {
    this.triangle = new AnimatedTriangle(app);

    // Position the triangle to the right of the text with some padding
    const labelDimensions = this.staticLabel.getLabelDimensions();
    this.triangle.position.set(
      labelDimensions.width + 8 + 6, // 8px padding + 6px for pivot offset
      (labelDimensions.height - 12) / 2 + 6 // Centered vertically + 6px for pivot offset
    );

    this.addChild(this.triangle);
  }

  /**
   * Get the static label component for separate baking
   */
  public getStaticLabel(): StaticEventLabel {
    return this.staticLabel;
  }

  /**
   * Get the animated triangle component for separate rendering
   */
  public getAnimatedTriangle(): AnimatedTriangle | undefined {
    return this.triangle;
  }

  /**
   * Switch to separated mode (for hover states)
   * This removes the triangle from this container so it can be rendered separately
   */
  public switchToSeparatedMode(): AnimatedTriangle | undefined {
    if (this.triangle && this.renderMode !== "separated") {
      this.removeChild(this.triangle);
      this.renderMode = "separated";
      return this.triangle;
    }
    return undefined;
  }

  /**
   * Switch back to dynamic mode
   * This re-adds the triangle to this container
   */
  public switchToDynamicMode(app: Application) {
    if (this.renderMode === "separated" && !this.triangle) {
      this.addTriangle(app);
      this.renderMode = "dynamic";
    } else if (this.triangle && this.renderMode === "separated") {
      this.addChild(this.triangle);
      this.renderMode = "dynamic";
    }
  }

  /**
   * Clean up resources
   */
  destroy(options?: Parameters<Container["destroy"]>[0]) {
    // Triangle will be cleaned up automatically if it's a child
    // If it was removed for separated rendering, the parent should clean it up
    super.destroy(options);
  }
}
