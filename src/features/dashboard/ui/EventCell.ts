import { Container, Text } from "pixi.js";
import { CELL_HEIGHT, CELL_WIDTH } from "../values/constants";

export class EventCell extends Container {
  private labelText: Text;

  constructor() {
    super();
    this.labelText = new Text({
      text: "",
      style: { fontSize: 13, fontWeight: "600", align: "center" },
    });
    this.labelText.anchor.set(0.5);
    this.labelText.y = CELL_HEIGHT / 2;
    this.labelText.x = CELL_WIDTH / 2;

    this.addChild(this.labelText);
  }

  setText(text: string) {
    this.labelText.text = text;
  }
}
