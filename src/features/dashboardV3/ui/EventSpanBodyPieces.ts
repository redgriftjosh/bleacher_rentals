import { Sprite, Texture } from "pixi.js";

/** Leaf sprites for caps/center. Kept separate for clarity/extensibility. */
export class EventSpanBodyLeft extends Sprite {
  constructor(tex: Texture) {
    super(tex);
    // this.eventMode = "none";
  }
}
export class EventSpanBodyCenter extends Sprite {
  constructor(tex: Texture) {
    super(tex);
    // this.eventMode = "none";
  }
}
export class EventSpanBodyRight extends Sprite {
  constructor(tex: Texture) {
    super(tex);
    // this.eventMode = "none";
  }
}
