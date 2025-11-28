import { Container, Text, Graphics, Application } from "pixi.js";
import { EventSpanType } from "../../util/Events";
import { LabelText } from "./LabelText";
import { GoodShuffleIcon } from "./GoodShuffleIcon";
import { Baker } from "../../util/Baker";
import { loadEventById } from "../../db/client/loadEventById";
import { supabaseClientRegistry } from "../../util/supabaseClientRegistry";

/**
 * Event cell label that can render in different modes for optimal caching
 * - static: Just text, can be fully baked
 * - dynamic: Text + static triangle, can be baked as unit
 * - separated: Text baked separately, triangle rendered live for animation
 */
export class PinnableSection extends Container {
  private labelText: LabelText;
  private eventInfo: EventSpanType;

  constructor(eventInfo: EventSpanType, app: Application, baker: Baker) {
    super();
    this.position.set(4, 4);

    this.eventInfo = eventInfo;

    // Make clickable
    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointerdown", this.handleClick.bind(this));

    // Always create the static label
    this.labelText = new LabelText(eventInfo);
    if (eventInfo.ev.goodshuffleUrl) {
      const labelDimensions = this.labelText.getNameLabelDimensions();
      const gsLogo = new GoodShuffleIcon(baker, eventInfo.ev.goodshuffleUrl);
      gsLogo.position.set(
        labelDimensions.width + 4, // 8px padding + 6px for pivot offset
        0 // Centered vertically + 6px for pivot offset
      );
      this.addChild(gsLogo);
    }
    this.addChild(this.labelText);

    // console.log("PinnableSection");
  }

  private async handleClick(e: any) {
    // Don't handle if clicking on an interactive child (like GoodShuffleIcon)
    // Check if the target or any parent is an interactive element
    let target = e.target;
    while (target && target !== this) {
      if (target.eventMode === "static" && target !== this.labelText) {
        return; // Let the child handle it
      }
      target = target.parent;
    }

    const supabase = supabaseClientRegistry.getClient();

    if (!supabase) {
      console.warn("No Supabase client available");
      return;
    }

    await loadEventById(this.eventInfo.ev.eventId, supabase);
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
