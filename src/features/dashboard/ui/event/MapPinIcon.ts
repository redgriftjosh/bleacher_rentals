import { Container, Graphics, Sprite, Texture, BlurFilter, FederatedPointerEvent } from "pixi.js";
import { Baker } from "../../util/Baker";
import { PngManager } from "../../util/PngManager";

/**
 * Map pin icon with hover animation + shadow and click interaction.
 * Mirrors TruckIcon patterns but uses preloaded map-pin.png via PngManager.
 */
export class MapPinIcon extends Container {
  private iconSprite: Sprite;
  private shadowGraphics: Graphics;
  private isAnimating = false;
  private isHovering = false;
  private originalScale = 1;
  private clickCallback?: () => void;
  private baker: Baker;

  constructor(baker: Baker, clickCallback?: () => void) {
    super();
    this.baker = baker;
    this.clickCallback = clickCallback;

    this.shadowGraphics = new Graphics();
    this.shadowGraphics.alpha = 0; // start hidden
    this.addChild(this.shadowGraphics);

    this.iconSprite = new Sprite();
    this.addChild(this.iconSprite);

    this.createFallbackTexture();
    this.tryAssignCachedTexture();
    // Subscribe for late load
    PngManager.onLoad("map-pin", this.handleAsyncLoaded);

    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointerenter", this.onHoverStart, this);
    this.on("pointerleave", this.onHoverEnd, this);
    this.on("pointerup", this.onPointerUp, this);

    this.updateShadow();
  }

  private tryAssignCachedTexture() {
    const cached = PngManager.getTexture("map-pin");
    if (!cached) return; // fallback already set

    const baked = this.baker.getTexture(`MapPinIcon-cached`, { width: 24, height: 24 }, (c) => {
      const s = new Sprite(cached);
      s.width = 24;
      s.height = 24;
      s.anchor.set(0, 0);
      s.position.set(0, 0);
      c.addChild(s);
    });
    this.iconSprite.texture = baked;
    this.iconSprite.anchor.set(0.5, 0.5);
  }

  private handleAsyncLoaded = (tex: Texture) => {
    // Rebuild baked texture using newly available source
    const baked = this.baker.getTexture(`MapPinIcon-cached`, { width: 24, height: 24 }, (c) => {
      const s = new Sprite(tex);
      s.width = 24;
      s.height = 24;
      s.anchor.set(0, 0);
      s.position.set(0, 0);
      c.addChild(s);
    });
    this.iconSprite.texture = baked;
    this.iconSprite.anchor.set(0.5, 0.5);
  };

  private createFallbackTexture() {
    const fallback = this.baker.getTexture(
      `MapPinIcon-fallback`,
      { width: 24, height: 24 },
      (c) => {
        const g = new Graphics();
        g.fill({ color: 0xef4444 }); // red-500
        g.roundRect(0, 0, 24, 24, 3);
        g.fill();
        c.addChild(g);
      }
    );
    this.iconSprite.texture = fallback;
    this.iconSprite.anchor.set(0.5, 0.5);
    this.iconSprite.alpha = 1;
    this.iconSprite.visible = true;
  }

  private onHoverStart() {
    if (this.isAnimating || this.isHovering) return;
    this.isHovering = true;
    this.animateHover(true);
  }

  private onHoverEnd() {
    if (!this.isHovering) return;
    this.isHovering = false;
    this.animateHover(false);
  }

  private onPointerUp(e: FederatedPointerEvent) {
    // Prevent tile click from also firing
    e.stopPropagation();
    if (this.clickCallback) this.clickCallback();
  }

  private animateHover(entering: boolean) {
    this.isAnimating = true;
    const targetScale = entering ? 1.2 : this.originalScale;
    const targetShadowAlpha = entering ? 0.001 : 0;
    const duration = 180;

    const startTime = performance.now();
    const startScale = this.iconSprite.scale.x;
    const startShadowAlpha = this.shadowGraphics.alpha;

    const step = () => {
      const now = performance.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      const currentScale = startScale + (targetScale - startScale) * ease;
      this.iconSprite.scale.set(currentScale);
      this.shadowGraphics.alpha = startShadowAlpha + (targetShadowAlpha - startShadowAlpha) * ease;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        this.isAnimating = false;
      }
    };

    requestAnimationFrame(step);
  }

  private updateShadow() {
    this.shadowGraphics.clear();
    this.shadowGraphics.fill({ color: 0x000000, alpha: 1 });
    this.shadowGraphics.ellipse(10, 12, 8, 8);
    this.shadowGraphics.fill();
    this.shadowGraphics.position.set(-5, -5);

    const blurFilter = new BlurFilter({});
    this.shadowGraphics.filters = [blurFilter];
  }

  public resetHoverState() {
    this.isHovering = false;
    this.isAnimating = false;
    this.iconSprite.scale.set(this.originalScale);
    this.shadowGraphics.alpha = 0;
  }

  destroy(options?: Parameters<Container["destroy"]>[0]) {
    PngManager.offLoad("map-pin", this.handleAsyncLoaded);
    this.off("pointerenter", this.onHoverStart);
    this.off("pointerleave", this.onHoverEnd);
    this.off("pointerup", this.onPointerUp);
    this.resetHoverState();
    super.destroy(options);
  }
}
