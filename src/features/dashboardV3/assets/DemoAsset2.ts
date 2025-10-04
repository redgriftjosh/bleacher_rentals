import { Application, Container, Graphics, Text } from "pixi.js";
import { Baker } from "../util/Baker";

export class DemoAsset2 extends Container {
  private app: Application;
  private baker: Baker;
  private animationLabel?: Text;
  private animationStartTime: number = 0;

  constructor(app: Application, baker: Baker) {
    super();
    this.app = app;
    this.baker = baker;

    this.eventMode = "static";
    this.cursor = "pointer";

    // Add hover event listeners
    this.on("pointerenter", () => {
      console.log("Hovered");
      this.renderDynamic();
      this.startAnimation();
    });

    this.on("pointerleave", () => {
      console.log("Unhovered");
      this.stopAnimation();
      this.renderStatic();
    });
    this.renderStatic();
  }

  private renderStatic() {
    this.removeChildren(); // Clear previous content

    const bg = new Graphics();
    bg.rect(0, 0, 200, 100).fill(0x3366cc); // Blue

    const label = new Text({
      text: "STATIC",
      style: { fill: 0xffffff, fontSize: 16, fontWeight: "bold" },
    });
    label.anchor.set(0.5);
    label.position.set(100, 50); // Center in the 200x100 area
    this.addChild(bg, label);
  }

  private renderDynamic() {
    this.removeChildren(); // Clear previous content

    const bg = new Graphics();
    bg.rect(0, 0, 200, 100).fill(0x33cc66); // Green - make it same size as static

    this.animationLabel = new Text({
      text: "DYNAMIC",
      style: { fill: 0xffffff, fontSize: 16, fontWeight: "bold" },
    });
    this.animationLabel.anchor.set(0.5);
    this.animationLabel.position.set(100, 50); // Center in the 200x100 area
    this.addChild(bg, this.animationLabel);
  }

  private startAnimation() {
    this.animationStartTime = Date.now();
    this.app.ticker.add(this.animate);
  }

  private stopAnimation() {
    this.app.ticker.remove(this.animate);
  }

  private animate = () => {
    if (this.animationLabel) {
      const elapsed = (Date.now() - this.animationStartTime) * 0.001; // Convert to seconds

      // Gentle bobbing animation
      const bobOffset = Math.sin(elapsed * 3) * 3; // 3 pixels up/down, 3 times per second
      this.animationLabel.y = 50 + bobOffset; // Use 50 as center Y instead of 25

      // Optional: Add subtle scale pulsing
      const scale = 1 + Math.sin(elapsed * 2) * 0.05; // Small scale pulse
      this.animationLabel.scale.set(scale);

      // Optional: Add color shifting
      const hue = (elapsed * 50) % 360; // Cycle through hues
      const color = this.hslToHex(hue, 100, 75);
      this.animationLabel.style.fill = color;
    }
  };

  private hslToHex(h: number, s: number, l: number): number {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color);
    };
    const r = f(0);
    const g = f(8);
    const b = f(4);
    return (r << 16) | (g << 8) | b;
  }
}
