import { Container, Graphics } from "pixi.js";

export class TestGraphic extends Container {
  private originalAlpha: number = 1;
  private originalScale: number = 1;
  private isAnimating: boolean = false;
  private bg: Graphics;

  constructor() {
    super();

    this.bg = new Graphics();

    // Draw red tile background (hardcoded)
    this.bg.rect(300, 100, 200, 100).fill(0xff0000);

    // Enable interactivity
    this.eventMode = "static";
    this.cursor = "pointer";

    // Add hover event listeners
    this.on("pointerover", this.onHoverStart.bind(this));
    this.on("pointerout", this.onHoverEnd.bind(this));

    this.width = 100;
    this.height = 50;

    this.addChild(this.bg);
  }

  private onHoverStart() {
    if (this.isAnimating) return;
    this.isAnimating = true;

    // Simple hover animation: scale up and brighten
    this.animateScale(1.05, 200); // Scale to 105% over 200ms
    this.animateAlpha(0.8, 200); // Fade to 80% opacity
  }

  private onHoverEnd() {
    if (!this.isAnimating) return;
    this.isAnimating = false;

    // Return to original state
    this.animateScale(this.originalScale, 200);
    this.animateAlpha(this.originalAlpha, 200);
  }

  private animateScale(targetScale: number, duration: number) {
    const startScale = this.scale.x;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease out)
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const currentScale = startScale + (targetScale - startScale) * easeOut;
      this.bg.scale.set(currentScale);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  private animateAlpha(targetAlpha: number, duration: number) {
    const startAlpha = this.alpha;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease out)
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const currentAlpha = startAlpha + (targetAlpha - startAlpha) * easeOut;
      this.alpha = currentAlpha;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  destroy() {
    // Remove event listeners before destroying
    this.off("pointerover");
    this.off("pointerout");
    super.destroy();
  }
}
