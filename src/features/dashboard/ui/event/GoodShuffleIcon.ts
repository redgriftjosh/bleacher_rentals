import { Graphics, Sprite, Texture, Assets, TextureSource, Container, BlurFilter } from "pixi.js";
import { Baker } from "../../util/Baker";
import { PngManager } from "../../util/PngManager";

export class GoodShuffleIcon extends Container {
  private iconSprite: Sprite;
  private shadowGraphics: Graphics;
  private isAnimating = false;
  private originalScale = 1;
  private isHovering = false; // Track hover state to prevent stuck states
  private goodshuffleUrl: string;
  private animationFrameId: number | null = null; // Track animation frame for cleanup
  private isDestroyed = false; // Track if component is destroyed

  constructor(baker: Baker, goodshuffleUrl: string) {
    super();

    this.goodshuffleUrl = goodshuffleUrl;

    // Create shadow graphics (initially hidden)
    this.shadowGraphics = new Graphics();
    this.shadowGraphics.alpha = 0; // Start invisible
    this.addChild(this.shadowGraphics);

    // Create the main sprite container
    this.iconSprite = new Sprite();
    this.addChild(this.iconSprite);

    // Always create fallback texture first to ensure something is visible
    this.createFallbackTexture(baker);

    // Check if GSLogo is already cached and replace if available
    const cachedTexture = PngManager.getTexture("GSLogo");
    if (cachedTexture) {
      this.createTextureFromLoaded(baker, cachedTexture);
    } else {
      // Try to load the real texture
      this.loadAndReplaceTexture(baker);
    }

    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointerenter", this.onHoverStart.bind(this));
    this.on("pointerleave", this.onHoverEnd.bind(this));
    this.on("pointerup", this.onPointerUp.bind(this));

    // Initialize shadow graphics
    this.updateShadow();
  }

  private onHoverStart() {
    if (this.isAnimating || this.isHovering) return;
    console.log("GoodShuffleIcon Hovered");
    this.isHovering = true;
    this.animateHover(true);
  }

  private onHoverEnd() {
    if (!this.isHovering) return;
    console.log("GoodShuffleIcon Unhovered");
    this.isHovering = false;
    this.animateHover(false);
  }

  private onPointerUp() {
    console.log("GoodShuffleIcon clicked, opening URL:", this.goodshuffleUrl);
    if (this.goodshuffleUrl) {
      window.open(this.goodshuffleUrl, "_blank");
    }
  }

  private animateHover(isHovering: boolean) {
    // Cancel any existing animation
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.isAnimating = true;

    const targetScale = isHovering ? 1.2 : this.originalScale;
    const targetShadowAlpha = isHovering ? 0.4 : 0; // Increased alpha for more visible shadow
    const duration = 200; // ms

    const startTime = Date.now();
    const startScale = this.iconSprite.scale.x;
    const startShadowAlpha = this.shadowGraphics.alpha;

    const animate = () => {
      // Safety check: stop if destroyed or sprites are null
      if (this.isDestroyed || !this.iconSprite || !this.shadowGraphics) {
        this.isAnimating = false;
        this.animationFrameId = null;
        return;
      }

      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth easing function (ease out)
      const easeOut = 1 - Math.pow(1 - progress, 3);

      // Animate scale (with null check)
      const currentScale = startScale + (targetScale - startScale) * easeOut;
      if (this.iconSprite && this.iconSprite.scale) {
        this.iconSprite.scale.set(currentScale);
      }

      // Animate shadow alpha (with null check)
      const currentShadowAlpha =
        startShadowAlpha + (targetShadowAlpha - startShadowAlpha) * easeOut;
      if (this.shadowGraphics) {
        this.shadowGraphics.alpha = currentShadowAlpha;
      }

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private updateShadow() {
    // Clear previous shadow
    this.shadowGraphics.clear();

    // Create a more pronounced drop shadow
    this.shadowGraphics.fill({ color: 0x000000, alpha: 1 }); // Full opacity, we'll control via container alpha

    // Create an elliptical shadow offset down and right
    this.shadowGraphics.ellipse(
      10, // x position (slightly right of center)
      12, // y position (below the icon)
      8, // width radius (slightly wider than icon)
      8 // height radius (squashed ellipse)
    );
    this.shadowGraphics.fill();

    // Add blur filter for realistic drop shadow effect
    const blurFilter = new BlurFilter({
      //   strength: 5, // Moderate blur for soft shadow
      //   quality: 4, // Good quality
    });
    this.shadowGraphics.filters = [blurFilter];
  }

  /**
   * Force reset hover state (useful when parent containers change)
   */
  public resetHoverState() {
    // console.log("Resetting GoodShuffleIcon hover state");
    this.isHovering = false;
    this.isAnimating = false;

    // Cancel any pending animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Reset to non-hovered state immediately (with null checks)
    if (this.iconSprite && this.iconSprite.scale) {
      this.iconSprite.scale.set(this.originalScale);
    }
    if (this.shadowGraphics) {
      this.shadowGraphics.alpha = 0;
    }
  }

  /**
   * Clean up resources and event listeners
   */
  destroy(options?: Parameters<Container["destroy"]>[0]) {
    // Mark as destroyed to stop any running animations
    this.isDestroyed = true;

    // Cancel any pending animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Clean up hover event listeners
    this.off("pointerenter");
    this.off("pointerleave");
    this.off("pointerup");

    // Reset state before destroying
    this.resetHoverState();

    super.destroy(options);
  }

  private createTextureFromLoaded(baker: Baker, cachedTexture: Texture) {
    // console.log("Creating texture from cached GSLogo");

    // Create the new texture with the cached image
    const newTexture = baker.getTexture(
      `GoodShuffleIcon-cached`,
      { width: 16, height: 16 },
      (c) => {
        const logoSprite = new Sprite(cachedTexture);
        logoSprite.width = 16;
        logoSprite.height = 16;
        logoSprite.position.set(0, 0);
        logoSprite.anchor.set(0, 0);
        c.addChild(logoSprite);
      }
    );

    this.iconSprite.texture = newTexture;
    // console.log("GoodShuffleIcon updated with cached texture");
  }

  private createFallbackTexture(baker: Baker) {
    // console.log("Creating fallback texture for GoodShuffleIcon");
    const fallbackTexture = baker.getTexture(
      `GoodShuffleIcon-fallback`,
      { width: 16, height: 16 },
      (c) => {
        const fallbackGraphics = new Graphics();
        fallbackGraphics.fill({ color: 0x4a90e2 }); // Nice blue color
        fallbackGraphics.roundRect(0, 0, 16, 16, 3); // Rounded rectangle
        fallbackGraphics.fill();
        c.addChild(fallbackGraphics);
      }
    );

    this.iconSprite.texture = fallbackTexture;
    // console.log("GoodShuffleIcon created with fallback texture", this.iconSprite.texture);

    // Make sure the sprite is visible
    this.iconSprite.alpha = 1;
    this.iconSprite.visible = true;
  }

  private async loadAndReplaceTexture(baker: Baker) {
    try {
      // console.log("Loading GSLogo.png with Assets API...");
      const imagePath = `${window.location.origin}/GSLogo.png`;
      const logoTexture = await Assets.load(imagePath);
      // console.log("Logo texture loaded successfully from:", imagePath);

      // Create the new texture with the loaded image
      const newTexture = baker.getTexture(
        `GoodShuffleIcon-loaded`,
        { width: 16, height: 16 },
        (c) => {
          const logoSprite = new Sprite(logoTexture);
          logoSprite.width = 16;
          logoSprite.height = 16;
          logoSprite.position.set(0, 0);
          logoSprite.anchor.set(0, 0);
          c.addChild(logoSprite);
        }
      );

      // Replace the fallback texture with the real one
      this.iconSprite.texture = newTexture;
      // console.log("GoodShuffleIcon texture replaced with loaded image");
    } catch (error) {
      console.error("Failed to load GSLogo.png, keeping fallback:", error);
    }
  }
}
