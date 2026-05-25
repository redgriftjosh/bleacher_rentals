import { Container, Graphics, Text } from "pixi.js";

/** 10×10 solid red circle with a white count number centred inside. */
export class AlertCount extends Container {
  private label: Text;
  private circle: Graphics;

  constructor(count: number = 0) {
    super();

    const radius = 7;

    this.circle = new Graphics();
    this.circle.circle(radius, radius, radius).fill(0xff0000);
    this.addChild(this.circle);

    this.label = new Text({
      text: String(count),
      style: {
        fontFamily: "Helvetica",
        fontSize: 10,
        fill: 0xffffff,
        align: "center",
      },
    });
    this.label.anchor.set(0.5, 0.5);
    this.label.position.set(radius, radius);
    this.addChild(this.label);

    // Hide when count is 0
    this.visible = count > 0;
  }

  /** Update the displayed count. Hides badge when 0. */
  setCount(count: number) {
    this.label.text = String(count);
    this.visible = count > 0;
  }
}
