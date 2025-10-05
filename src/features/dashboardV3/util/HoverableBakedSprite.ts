import { Application, Sprite, Container } from "pixi.js";
import { Baker } from "./Baker";

/**
 * Generic hoverable baked sprite that swaps between baked and live content
 * Provides maximum performance with baked textures while enabling interactivity on hover
 *
 * @example
 * ```typescript
 * const hoverableSprite = new HoverableBakedSprite(
 *   app,
 *   baker,
 *   "my-cache-key",
 *   (container) => {
 *     // Build your content here - this runs for both baked and live
 *     const myComponent = new MyInteractiveComponent();
 *     container.addChild(myComponent);
 *   }
 * );
 * ```
 */
export class HoverableBakedSprite extends Container {
  private bakedSprite: Sprite;
  private liveContent: Container;
  private baker: Baker;
  private cacheKey: string;
  private contentBuilder: (container: Container) => void;
  private isShowingLive = false;
  protected dimensions?: { width: number; height: number };

  constructor(
    baker: Baker,
    cacheKey: string,
    contentBuilder: (container: Container) => void,
    dimensions?: { width: number; height: number }
  ) {
    super();
    this.baker = baker;
    this.cacheKey = cacheKey;
    this.contentBuilder = contentBuilder;
    this.dimensions = dimensions;

    this.eventMode = "static";
    this.cursor = "pointer";

    // Create baked texture for performance
    const texture = baker.getTexture(this.cacheKey, this.dimensions || null, (c) =>
      this.contentBuilder(c)
    );

    // Create baked sprite
    this.bakedSprite = new Sprite(texture);
    this.addChild(this.bakedSprite);

    // Create live content container (initially empty)
    this.liveContent = new Container();

    // Add hover listeners to swap content
    this.on("pointerenter", this.showLiveContent.bind(this));
    this.on("pointerleave", this.showBakedContent.bind(this));

    console.log(`HoverableBakedSprite created: ${cacheKey}`);
  }

  /**
   * Switch to live content for interactivity
   */
  private showLiveContent() {
    if (this.isShowingLive) return;

    console.log(`Switching to live content: ${this.cacheKey}`);
    this.isShowingLive = true;

    // Hide baked sprite
    this.bakedSprite.visible = false;

    // Create live content using the provided builder or override
    this.liveContent.removeChildren();
    this.buildLiveContent(this.liveContent);
    this.addChild(this.liveContent);
  }

  /**
   * Build live content - can be overridden by subclasses for custom behavior
   */
  protected buildLiveContent(container: Container) {
    this.contentBuilder(container);
  }

  /**
   * Switch back to baked texture for performance
   */
  private showBakedContent() {
    if (!this.isShowingLive) return;

    console.log(`Switching to baked content: ${this.cacheKey}`);
    this.isShowingLive = false;

    // Reset any hover states in children before switching back
    this.resetChildHoverStates(this.liveContent);

    // Show baked sprite
    this.bakedSprite.visible = true;

    // Hide and clear live content
    if (this.liveContent.parent) {
      this.removeChild(this.liveContent);
    }
    this.liveContent.removeChildren();
  }

  /**
   * Reset hover states in all children that support it
   */
  private resetChildHoverStates(container: Container) {
    container.children.forEach((child) => {
      // Check if child has a resetHoverState method (like GoodShuffleIcon)
      if (typeof (child as any).resetHoverState === "function") {
        (child as any).resetHoverState();
      }

      // Recursively check children
      if (child instanceof Container) {
        this.resetChildHoverStates(child);
      }
    });
  }

  /**
   * Check if currently showing live content
   */
  public get isLive(): boolean {
    return this.isShowingLive;
  }

  /**
   * Force refresh the baked texture (useful if content changes)
   */
  public refreshBakedTexture() {
    // Invalidate old texture
    this.baker.invalidate(this.cacheKey);

    // Create new texture
    const newTexture = this.baker.getTexture(this.cacheKey, this.dimensions || null, (c) =>
      this.contentBuilder(c)
    );

    // Update sprite texture
    this.bakedSprite.texture = newTexture;

    console.log(`Refreshed baked texture: ${this.cacheKey}`);
  }

  /**
   * Clean up event listeners and resources
   */
  destroy(options?: Parameters<Container["destroy"]>[0]) {
    this.off("pointerenter");
    this.off("pointerleave");
    super.destroy(options);
  }
}
