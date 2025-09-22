import { Container, Sprite, Text, TextStyle, Texture } from "pixi.js";
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
  private static readonly MAX_W = CELL_WIDTH * 10; // tweak as desired
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

  setEvent(ev: BleacherEvent, textColor?: number) {
    // Defensive checks
    if (!ev || !ev.eventName || !this.sprite) {
      this.visible = false;
      return;
    }

    // const key = `eventLabel:${ev.bleacherEventId}:v1`;
    const color = textColor ?? 0x000000;
    const key = `eventLabel:${ev.bleacherEventId}:v2:${color.toString(16)}`;
    const nameTextStyle = new TextStyle({
      fontFamily: "Helvetica",
      fontSize: 14,
      fontWeight: "500",
      align: "left",
      fill: color,
    });
    const addressTextStyle = new TextStyle({
      fontFamily: "Helvetica",
      fontSize: 12,
      fontWeight: "300",
      align: "left",
      fill: color,
    });

    try {
      // Measure both texts to pick a reasonable RT width
      const nameText = new Text({ text: ev.eventName, style: nameTextStyle });
      const addressText = new Text({ text: ev.address || "", style: addressTextStyle });

      const targetW = Math.min(
        EventSpanLabel.MAX_W,
        Math.max(Math.ceil(nameText.width), Math.ceil(addressText.width)) +
          EventSpanLabel.PADDING_X * 2
      );

      nameText.destroy();
      addressText.destroy();

      const tex = this.baker.getTexture(key, { width: targetW, height: CELL_HEIGHT }, (c) => {
        const nameT = new Text({
          text: ev.eventName,
          style: nameTextStyle,
        });
        nameT.position.set(EventSpanLabel.PADDING_X, 2);

        const addressT = new Text({ text: ev.address || "", style: addressTextStyle });
        addressT.position.set(EventSpanLabel.PADDING_X, 18);

        c.addChild(nameT, addressT);
      });

      // Check if texture is valid before assigning
      if (tex && !tex.destroyed && this.sprite) {
        this.sprite.texture = tex;
        this.visible = true;
      } else {
        this.visible = false;
      }
    } catch (error) {
      console.warn("Error setting EventSpanLabel:", error);
      this.visible = false;
    }
  }

  placeUnpinned(x: number, y: number) {
    try {
      this.position.set(x, y);
      this.pinned = false;
    } catch (error) {
      console.warn("Error placing unpinned label:", error);
    }
  }

  placePinned(leftX: number, y: number) {
    try {
      this.position.set(leftX, y);
      this.pinned = true;
    } catch (error) {
      console.warn("Error placing pinned label:", error);
    }
  }

  isPinned() {
    return this.pinned;
  }

  hide() {
    this.visible = false;
  }
}
