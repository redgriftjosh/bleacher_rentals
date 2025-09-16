import { Container, Sprite, Text, Texture } from "pixi.js";
import type { BleacherEvent } from "../db/client/bleachers";
import { Baker } from "../util/Baker";
import { CELL_HEIGHT, CELL_WIDTH } from "../values/constants";

/**
 * Baked label for an event span. The label texture is built once per event id/name
 * and then reused. Placement supports pinned (to left edge) and unpinned modes.
 */
export class EventSpanLabel extends Container {
  private sprite: Sprite;
  private baker: Baker;
  private pinned = false;

  // cap label width to something reasonable; it will be masked by the grid anyway
  private static readonly MAX_W = CELL_WIDTH * 3; // tweak as desired
  private static readonly PADDING_X = 4;

  constructor(baker: Baker) {
    super();
    this.baker = baker;
    this.sprite = new Sprite(Texture.WHITE);
    this.sprite.eventMode = "none";
    this.addChild(this.sprite);
    this.eventMode = "none";
    this.visible = false;
  }

  setEvent(ev: BleacherEvent) {
    const key = `eventLabel:${ev.bleacherEventId}:v1`;

    // Measure once to pick a reasonable RT width (cache miss only).
    const tmp = new Text({
      text: ev.eventName,
      style: { fontSize: 12, fontWeight: "400", align: "left" },
    });
    const targetW = Math.min(
      EventSpanLabel.MAX_W,
      Math.ceil(tmp.width) + EventSpanLabel.PADDING_X * 2
    );
    tmp.destroy(); // free temporary Text object

    const tex = this.baker.getTexture(key, { width: targetW, height: CELL_HEIGHT }, (c) => {
      const t = new Text({
        text: ev.eventName,
        style: { fontSize: 12, fontWeight: "400", align: "left" },
      });
      t.position.set(EventSpanLabel.PADDING_X, 2);
      c.addChild(t);
    });

    this.sprite.texture = tex;
    this.visible = true;
  }

  placeUnpinned(x: number, y: number) {
    this.position.set(x, y);
    this.pinned = false;
  }

  placePinned(leftX: number, y: number) {
    this.position.set(leftX, y);
    this.pinned = true;
  }

  isPinned() {
    return this.pinned;
  }

  hide() {
    this.visible = false;
  }
}
