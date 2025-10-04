import { Container, Text } from "pixi.js";
import { EventSpanType } from "../util/Events";

export class EventCellLabel extends Container {
  constructor(eventInfo: EventSpanType, firstVisibleColIndex: number, currentColIndex: number) {
    super();

    const label = new Text({
      text: `firstVisibel:${firstVisibleColIndex} current:${currentColIndex}`,
      style: {
        fontFamily: "Helvetica",
        fontSize: 14,
        fontWeight: "500",
        align: "left",
      },
    });
    this.addChild(label);
  }
}
