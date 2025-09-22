import { Container, Graphics, Texture, Text } from "pixi.js";
import { Baker } from "../util/Baker";
import { CELL_HEIGHT } from "../values/constants";
import { EventSpanBodyLeft, EventSpanBodyCenter, EventSpanBodyRight } from "./EventSpanBodyPieces";

/**
 * 3-slice span body (left cap, center, right cap), with pieces baked once per style.
 * Draws only the clipped width visible in the viewport; pieces are tinted per-event.
 */
export class EventSpanBody extends Container {
  private static capW = 12; // tweak radius/visual width
  private static centerW = 8; // tileable/stretchable middle

  private static texLeft?: Texture;
  private static texCenter?: Texture;
  private static texRight?: Texture;

  private left?: EventSpanBodyLeft;
  private center?: EventSpanBodyCenter;
  private right?: EventSpanBodyRight;

  private border?: Graphics;

  constructor(baker: Baker) {
    super();
    // this.eventMode = "none";

    this.border = new Graphics(); // NEW

    try {
      // lazily bake shared textures once per process/style
      if (!EventSpanBody.texLeft || !EventSpanBody.texCenter || !EventSpanBody.texRight) {
        EventSpanBody.bakePieces(baker);
      }

      // Defensive check for valid textures
      if (!EventSpanBody.texLeft || !EventSpanBody.texCenter || !EventSpanBody.texRight) {
        console.warn("EventSpanBody: Failed to create textures");
        this.visible = false;
        return;
      }

      this.left = new EventSpanBodyLeft(EventSpanBody.texLeft);
      this.center = new EventSpanBodyCenter(EventSpanBody.texCenter);
      this.right = new EventSpanBodyRight(EventSpanBody.texRight);

      this.addChild(this.left, this.center, this.right);
      this.addChild(this.border);
      this.visible = false;
    } catch (error) {
      console.warn("Error creating EventSpanBody:", error);
      this.visible = false;
    }
  }

  draw(
    x: number,
    y: number,
    w: number,
    h: number,
    tint: number,
    showLeftCap: boolean,
    showRightCap: boolean,
    opts?: { outlined?: boolean; outlineColor?: number; outlineWidth?: number }
  ) {
    // if (w <= 0 || h <= 0) {
    //   this.visible = false;
    //   return;
    // }

    // Defensive check for destroyed components
    if (w <= 0 || h <= 0 || !this.left || !this.center || !this.right) {
      this.visible = false;
      if (this.border) this.border.visible = false;
      return;
    }

    this.visible = true;

    const capW = EventSpanBody.capW;
    let cx = x;
    let cw = w;

    // left cap
    if (showLeftCap && this.left) {
      try {
        this.left.visible = true;
        this.left.tint = tint;
        this.left.position.set(x, y);
        this.left.width = capW;
        this.left.height = h;
        cx += capW;
        cw -= capW;
      } catch (error) {
        console.warn("Error setting left cap:", error);
        this.left.visible = false;
      }
    } else if (this.left) {
      this.left.visible = false;
    }

    // right cap
    if (showRightCap && this.right) {
      try {
        this.right.visible = true;
        this.right.tint = tint;
        this.right.position.set(x + w - capW, y);
        this.right.width = capW;
        this.right.height = h;
        cw -= capW;
      } catch (error) {
        console.warn("Error setting right cap:", error);
        this.right.visible = false;
      }
    } else if (this.right) {
      this.right.visible = false;
    }

    // center fill
    if (cw > 0 && this.center) {
      try {
        this.center.visible = true;
        this.center.tint = tint;
        this.center.position.set(cx, y);
        this.center.width = cw; // stretch center horizontally (baked neutral)
        this.center.height = h;
      } catch (error) {
        console.warn("Error setting center:", error);
        this.center.visible = false;
      }
    } else if (this.center) {
      this.center.visible = false;
    }

    if (opts?.outlined && this.border) {
      const color = opts.outlineColor ?? 0x000000;
      const width = Math.max(1, Math.floor(opts.outlineWidth ?? 1)); // 1px logical
      this.border.clear();
      // Draw a crisp rectangle; align stroke fully inside to avoid bleeding
      this.border
        .rect(x + 0.5, y + 0.5, Math.max(0, w - 1), Math.max(0, h - 1))
        .stroke({ width, color });
      this.border.visible = true;
    } else if (this.border) {
      this.border.visible = false;
      this.border.clear();
    }
  }

  hide() {
    this.visible = false;
    if (this.border) {
      this.border.visible = false;
      this.border.clear();
    }
  }

  /** Bake neutral (white) pieces once; you can customize shape, border, shadows here. */
  private static bakePieces(baker: Baker) {
    const H = CELL_HEIGHT - 1;
    const capW = EventSpanBody.capW;
    const centerW = EventSpanBody.centerW;

    // LEFT CAP
    const leftTex = baker.getTexture("spanBody:capLeft:v1", { width: capW, height: H }, (c) => {
      //   const g = new Graphics();
      //   // Customize: rounded-left rect, flat right. Using simple rect for portability.
      //   g.rect(0, 0, capW, H).fill(0xffffff);
      //   c.addChild(g);
      const g = new Graphics();
      g.rect(0, 0, capW, H).fill(0xffffff); // neutral white body (will be tinted later)
      c.addChild(g);
    });

    // CENTER
    const centerTex = baker.getTexture("spanBody:center:v1", { width: centerW, height: H }, (c) => {
      const g = new Graphics();
      g.rect(0, 0, centerW, H).fill(0xffffff);
      c.addChild(g);
    });

    // RIGHT CAP
    const rightTex = baker.getTexture("spanBody:capRight:v1", { width: capW, height: H }, (c) => {
      const g = new Graphics();
      // Customize: flat left, rounded-right. Simple rect here.
      g.rect(0, 0, capW, H).fill(0xffffff);
      c.addChild(g);
    });

    EventSpanBody.texLeft = leftTex;
    EventSpanBody.texCenter = centerTex;
    EventSpanBody.texRight = rightTex;
  }

  /** Clear static textures when app is recreated */
  static clearStaticTextures() {
    try {
      if (EventSpanBody.texLeft && !EventSpanBody.texLeft.destroyed) {
        EventSpanBody.texLeft.destroy(true);
      }
      if (EventSpanBody.texCenter && !EventSpanBody.texCenter.destroyed) {
        EventSpanBody.texCenter.destroy(true);
      }
      if (EventSpanBody.texRight && !EventSpanBody.texRight.destroyed) {
        EventSpanBody.texRight.destroy(true);
      }
    } catch (error) {
      console.warn("Error clearing EventSpanBody static textures:", error);
    }

    EventSpanBody.texLeft = undefined;
    EventSpanBody.texCenter = undefined;
    EventSpanBody.texRight = undefined;
  }
}
