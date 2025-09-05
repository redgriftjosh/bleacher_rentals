import { Container, Text } from "pixi.js";

export class BleacherCell extends Container {
  private bleacherNumber: Text;
  private bleacherRows: Text;
  private bleacherSeats: Text;
  private summerHomeBase: Text;
  private winterHomeBase: Text;

  constructor() {
    super();

    this.bleacherNumber = new Text({
      text: "",
      style: { fill: 0xf0b000, fontSize: 16, align: "center", fontWeight: "bold" },
    });
    this.bleacherNumber.anchor.set(0, 0);
    this.bleacherNumber.y = 2;
    this.bleacherNumber.x = 3;

    this.bleacherRows = new Text({
      text: "",
      style: { fill: 0x6b6b6b, fontSize: 11, align: "center" },
    });
    this.bleacherRows.anchor.set(0, 0);
    this.bleacherRows.y = 18;
    this.bleacherRows.x = 3;

    this.bleacherSeats = new Text({
      text: "450seats",
      style: { fill: 0x6b6b6b, fontSize: 11, align: "center" },
    });
    this.bleacherSeats.anchor.set(0, 0);
    this.bleacherSeats.y = 18;
    this.bleacherSeats.x = 40;

    this.summerHomeBase = new Text({
      text: "Oklahoma",
      style: { fill: 0xfe9900, fontSize: 11, align: "center" },
    });
    this.summerHomeBase.anchor.set(0, 0);
    this.summerHomeBase.y = 30;
    this.summerHomeBase.x = 3;

    this.winterHomeBase = new Text({
      text: "Oklahoma",
      style: { fill: 0x2b80ff, fontSize: 11, align: "center" },
    });
    this.winterHomeBase.anchor.set(0, 0);
    this.winterHomeBase.y = 30;
    this.winterHomeBase.x = this.summerHomeBase.width + 5; // how can I make this always right after summerHomeBase so it looks like they're one Text?

    this.addChild(
      this.bleacherNumber,
      this.bleacherRows,
      this.bleacherSeats,
      this.summerHomeBase,
      this.winterHomeBase
    );
  }

  setText(
    bleacherNumber: number,
    bleacherRows: number,
    bleacherSeats: number,
    summerHomeBase: string,
    winterHomeBase: string
  ) {
    this.bleacherNumber.text = String(bleacherNumber);
    this.bleacherRows.text = String(bleacherRows) + "row";
    this.bleacherSeats.text = String(bleacherSeats) + "seats";

    this.summerHomeBase.text = summerHomeBase;
    const summerW = this.summerHomeBase.getLocalBounds().width;

    this.winterHomeBase.x = this.summerHomeBase.x + Math.ceil(summerW) + 5;
    this.winterHomeBase.text = winterHomeBase;
  }
}
