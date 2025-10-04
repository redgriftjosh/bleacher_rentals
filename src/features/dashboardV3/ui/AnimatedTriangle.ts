import { Graphics, Application } from "pixi.js";

/**
 * Animated triangle component that handles its own hover states and animation
 * This is separate from static content so it can be rendered independently
 */
export class AnimatedTriangle extends Graphics {
  private animationStartTime: number = 0;
  private app: Application;
  private isAnimating: boolean = false;

  constructor(app: Application) {
    super();
    this.app = app;

    this.setupTriangle();
    this.setupInteractivity();
  }

  private setupTriangle() {
    this.fill({ color: 0x666666 }); // Dark gray color
    this.moveTo(0, 0);
    this.lineTo(12, 6); // Right point (12x12 triangle)
    this.lineTo(0, 12); // Bottom point
    this.lineTo(0, 0); // Back to top
    this.fill();

    // Set the pivot to the center of the triangle for proper rotation
    this.pivot.set(6, 6); // Center of 12x12 triangle
  }

  private setupInteractivity() {
    this.eventMode = "static";
    this.cursor = "pointer";

    this.on("pointerenter", () => {
      console.log("Triangle Hovered");
      this.startAnimation();
    });

    this.on("pointerleave", () => {
      console.log("Triangle Unhovered");
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
      // Reset rotation when stopping
      this.rotation = 0;
    }
  }

  private animate = () => {
    if (this.isAnimating) {
      const elapsed = (Date.now() - this.animationStartTime) * 0.001; // Convert to seconds

      // Simple 360 degree rotation per second
      this.rotation = elapsed * 2 * Math.PI; // 2π radians = 360 degrees
    }
  };

  /**
   * Clean up animation when component is destroyed
   */
  destroy(options?: Parameters<Graphics["destroy"]>[0]) {
    this.stopAnimation();
    super.destroy(options);
  }
}
