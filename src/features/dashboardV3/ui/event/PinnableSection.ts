import { Container, Text, Graphics, Application } from "pixi.js";
import { EventSpanType } from "../../util/Events";
import { LabelText } from "./LabelText";
import { GoodShuffleIcon } from "./GoodShuffleIcon";
import { Baker } from "../../util/Baker";

/**
 * Event cell label that can render in different modes for optimal caching
 * - static: Just text, can be fully baked
 * - dynamic: Text + static triangle, can be baked as unit
 * - separated: Text baked separately, triangle rendered live for animation
 */
export class PinnableSection extends Container {
  private labelText: LabelText;

  constructor(eventInfo: EventSpanType, app: Application, baker: Baker) {
    super();
    this.position.set(4, 4);

    // Always create the static label
    this.labelText = new LabelText(eventInfo);
    const gsLogo = new GoodShuffleIcon(baker);
    const labelDimensions = this.labelText.getLabelDimensions();
    gsLogo.position.set(
      labelDimensions.width + 4, // 8px padding + 6px for pivot offset
      0 // Centered vertically + 6px for pivot offset
    );

    this.addChild(this.labelText, gsLogo);
    console.log("PinnableSection");

    // Add hover functionality (will only work when this component is live, not baked)
    // this.eventMode = "static";
    // this.cursor = "pointer";

    // this.on("pointerenter", () => {
    //   console.log("PinnableSection Hovered");
    // });

    // this.on("pointerleave", () => {
    //   console.log("PinnableSection Unhovered");
    // });
  }

  /**
   * Clean up resources
   */
  destroy(options?: Parameters<Container["destroy"]>[0]) {
    // Clean up hover event listeners
    this.off("pointerenter");
    this.off("pointerleave");

    // Logo will be cleaned up automatically if it's a child
    super.destroy(options);
  }
}
