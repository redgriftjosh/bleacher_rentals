import { Container, Text } from "pixi.js";
import { EventSpanType } from "../../util/Events";
import { LOST_EVENT_COLOR } from "@/features/dashboard/values/constants";

/**
 * Static event label component without any interactive elements
 * This can be safely baked into a RenderTexture for performance
 */
export class LabelText extends Container {
  private nameLabel: Text;
  private addressLabel?: Text;

  constructor(eventInfo: EventSpanType) {
    super();

    // Determine text color based on contract status
    const isBooked = eventInfo.ev.contract_status === "BOOKED";
    const isLost = eventInfo.ev.contract_status === "LOST";
    const eventColor = isLost
      ? LOST_EVENT_COLOR
      : eventInfo.ev.hslHue != null
      ? this.hslToRgbInt(eventInfo.ev.hslHue, 60, 60)
      : 0x808080;
    const textColor = isBooked ? 0x000000 : eventColor;

    // Event name (main label)
    this.nameLabel = new Text({
      text: `${eventInfo.ev.eventName}`,
      style: {
        fontFamily: "Helvetica",
        fontSize: 14,
        fontWeight: "500",
        align: "left",
        fill: textColor,
      },
    });
    this.nameLabel.position.set(0, 2);
    this.addChild(this.nameLabel);

    // Address (secondary label)
    if (eventInfo.ev.address) {
      this.addressLabel = new Text({
        text: eventInfo.ev.address,
        style: {
          fontFamily: "Helvetica",
          fontSize: 12,
          fontWeight: "300",
          align: "left",
          fill: textColor,
        },
      });
      this.addressLabel.position.set(0, 18);
      this.addChild(this.addressLabel);
    }

    // console.log("LabelText");
  }

  /**
   * Convert HSL to RGB integer for text color
   */
  private hslToRgbInt(h: number, s: number, l: number): number {
    const S = s / 100,
      L = l / 100;
    const C = (1 - Math.abs(2 * L - 1)) * S;
    const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = L - C / 2;
    let r = 0,
      g = 0,
      b = 0;
    if (h < 60) [r, g, b] = [C, X, 0];
    else if (h < 120) [r, g, b] = [X, C, 0];
    else if (h < 180) [r, g, b] = [0, C, X];
    else if (h < 240) [r, g, b] = [0, X, C];
    else if (h < 300) [r, g, b] = [X, 0, C];
    else [r, g, b] = [C, 0, X];
    const R = Math.round((r + m) * 255);
    const G = Math.round((g + m) * 255);
    const B = Math.round((b + m) * 255);
    return (R << 16) | (G << 8) | B;
  }

  /**
   * Get the dimensions needed for positioning additional elements (entire container)
   */
  public getLabelDimensions(): { width: number; height: number } {
    const bounds = this.getBounds();
    return { width: bounds.width, height: bounds.height };
  }

  /**
   * Get the dimensions of just the name label (excluding address)
   */
  public getNameLabelDimensions(): { width: number; height: number } {
    const bounds = this.nameLabel.getBounds();
    return { width: bounds.width, height: bounds.height };
  }
}
