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

  private left: EventSpanBodyLeft;
  private center: EventSpanBodyCenter;
  private right: EventSpanBodyRight;

  constructor(baker: Baker) {
    super();
    this.eventMode = "none";

    // lazily bake shared textures once per process/style
    if (!EventSpanBody.texLeft || !EventSpanBody.texCenter || !EventSpanBody.texRight) {
      EventSpanBody.bakePieces(baker);
    }

    this.left = new EventSpanBodyLeft(EventSpanBody.texLeft!);
    this.center = new EventSpanBodyCenter(EventSpanBody.texCenter!);
    this.right = new EventSpanBodyRight(EventSpanBody.texRight!);

    this.addChild(this.left, this.center, this.right);
    this.visible = false;
  }

  draw(
    x: number,
    y: number,
    w: number,
    h: number,
    tint: number,
    showLeftCap: boolean,
    showRightCap: boolean
  ) {
    if (w <= 0 || h <= 0) {
      this.visible = false;
      return;
    }
    this.visible = true;

    const capW = EventSpanBody.capW;
    let cx = x;
    let cw = w;

    // left cap
    if (showLeftCap) {
      this.left.visible = true;
      this.left.tint = tint;
      this.left.position.set(x, y);
      this.left.width = capW;
      this.left.height = h;
      cx += capW;
      cw -= capW;
    } else {
      this.left.visible = false;
    }

    // right cap
    if (showRightCap) {
      this.right.visible = true;
      this.right.tint = tint;
      this.right.position.set(x + w - capW, y);
      this.right.width = capW;
      this.right.height = h;
      cw -= capW;
    } else {
      this.right.visible = false;
    }

    // center fill
    if (cw > 0) {
      this.center.visible = true;
      this.center.tint = tint;
      this.center.position.set(cx, y);
      this.center.width = cw; // stretch center horizontally (baked neutral)
      this.center.height = h;
    } else {
      this.center.visible = false;
    }
  }

  hide() {
    this.visible = false;
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

      const label = new Text({
        text: "L",
        style: {
          fill: 0x000000, // white text as requested
          fontSize: Math.floor(H * 0.45), // scale with height
          fontWeight: "700",
          align: "center",
        },
      });
      label.anchor.set(0.5); // center by anchor
      label.position.set(capW / 2, H / 2); // center in the cap
      c.addChild(label);
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
}
