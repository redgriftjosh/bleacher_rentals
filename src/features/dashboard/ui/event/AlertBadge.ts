import { Container, Graphics, Sprite, Text } from "pixi.js";
import { Baker } from "../../util/Baker";

export class AlertBadge extends Sprite {
  constructor(baker: Baker, alertCount: number) {
    super();

    const radius = 8;
    const size = radius * 2 + 2;

    this.texture = baker.getTexture(
      `AlertBadge:${alertCount}`,
      { width: size, height: size },
      (c) => {
        const bg = new Graphics();
        bg.circle(radius + 1, radius + 1, radius).fill(0xff0000);
        c.addChild(bg);

        const label = new Text({
          // text: String(alertCount),
          text: "!",
          style: {
            fontFamily: "Helvetica",
            fontSize: 10,
            fontWeight: "bold",
            fill: 0xffffff,
            align: "center",
          },
        });
        label.anchor.set(0.5, 0.5);
        label.x = radius + 1;
        label.y = radius + 1;
        c.addChild(label);
      },
    );
  }
}
