import { Sprite, Application, Texture } from "pixi.js";

/**
 * Animated logo component that handles its own hover states and animation
 * This replaces the triangle with the GSLogo.png
 */
export class AnimatedLogo extends Sprite {
  private animationStartTime: number = 0;
  private app: Application;
  private isAnimating: boolean = false;
  private originalScale: number = 1;

  constructor(app: Application) {
    // Load the logo texture from public folder
    const logoTexture = Texture.from("GSLogo.png");
    super(logoTexture);

    this.app = app;
    this.setupLogo();
    this.setupInteractivity();
  }

  private setupLogo() {
    // Scale the logo to be roughly the same size as the triangle (12x12)
    // Adjust these values based on the actual logo dimensions
    this.width = 16;
    this.height = 16;
    this.originalScale = this.scale.x;

    // Set the anchor to the center for proper rotation
    this.anchor.set(0.5, 0.5);
  }

  private setupInteractivity() {
    this.eventMode = "static";
    this.cursor = "pointer";

    this.on("pointerenter", () => {
      console.log("Logo Hovered");
      this.startAnimation();
    });

    this.on("pointerleave", () => {
      console.log("Logo Unhovered");
      this.stopAnimation();
    });
  }

  private startAnimation() {
    if (!this.isAnimating) {
      this.isAnimating = true;
      this.animationStartTime = Date.now();
      this.app.ticker.add(this.animate);
    }
  }

  private stopAnimation() {
    if (this.isAnimating) {
      this.isAnimating = false;
      this.app.ticker.remove(this.animate);
      // Reset rotation and scale when stopping
      this.rotation = 0;
      this.scale.set(this.originalScale);
    }
  }

  private animate = () => {
    if (this.isAnimating) {
      const elapsed = (Date.now() - this.animationStartTime) * 0.001; // Convert to seconds

      // Smooth rotation + subtle pulsing scale effect
      this.rotation = elapsed * 2 * Math.PI; // 360 degrees per second

      // Subtle scale pulsing (between 90% and 110% of original size)
      const pulseScale = this.originalScale + Math.sin(elapsed * 4) * 0.1;
      this.scale.set(pulseScale);
    }
  };

  /**
   * Clean up animation when component is destroyed
   */
  destroy(options?: Parameters<Sprite["destroy"]>[0]) {
    this.stopAnimation();
    super.destroy(options);
  }
}
