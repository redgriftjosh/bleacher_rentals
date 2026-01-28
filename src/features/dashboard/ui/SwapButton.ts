import { Container, Sprite, Graphics, Text, Ticker } from "pixi.js";
import { Baker } from "../util/Baker";

export type SwapButtonState = "default" | "selected" | "prominent" | "hidden";

/**
 * A small "Swap" button for the BleacherCell, styled with rounded corners.
 * Uses Baker for texture caching. Supports visual states:
 * - default: grey/silver
 * - selected: blue highlight
 * - prominent: pulsing animation to indicate "select a partner"
 * - hidden: not visible
 */
export class SwapButton extends Container {
  private sprite: Sprite;
  private baker: Baker;
  private _state: SwapButtonState = "default";
  private _isDestroyed = false;
  private _pulseActive = false;
  private _pulseTick?: () => void;

  private static readonly WIDTH = 38;
  private static readonly HEIGHT = 22;

  constructor(baker: Baker) {
    super();
    this.baker = baker;
    this.sprite = new Sprite();
    this.addChild(this.sprite);

    this.eventMode = "static";
    this.cursor = "pointer";

    this.on("pointerover", () => {
      if (!this._isDestroyed) this.sprite.scale.set(1.06);
    });
    this.on("pointerout", () => {
      if (!this._isDestroyed) this.sprite.scale.set(1);
    });

    this.setState("default");
  }

  setState(state: SwapButtonState) {
    if (state === "hidden") {
      this.visible = false;
      this.stopPulse();
      return;
    }

    this.visible = true;
    this._state = state;

    const w = SwapButton.WIDTH;
    const h = SwapButton.HEIGHT;
    const key = `SwapButton:${state}:v2`;

    const tex = this.baker.getTexture(key, { width: w, height: h }, (c) => {
      const g = new Graphics();
      const radius = 4;

      let bg: number;
      let border: number;
      let textColor: number;

      switch (state) {
        case "selected":
          bg = 0xdbeafe; // blue-100
          border = 0x3b82f6; // blue-500
          textColor = 0x1d4ed8; // blue-700
          break;
        case "prominent":
          bg = 0xfef3c7; // amber-100
          border = 0xf59e0b; // amber-500
          textColor = 0xb45309; // amber-700
          break;
        default: // "default"
          bg = 0xf3f4f6; // gray-100
          border = 0x9ca3af; // gray-400
          textColor = 0x4b5563; // gray-600
          break;
      }

      g.roundRect(0, 0, w, h, radius).fill(bg).stroke({ width: 1, color: border, alignment: 1 });
      c.addChild(g);

      const label = new Text({
        text: state === "selected" ? "Swap" : "Swap",
        style: { fill: textColor, fontSize: 10, fontWeight: "bold" },
      });
      label.anchor.set(0.5);
      label.position.set(w / 2, h / 2);
      c.addChild(label);
    });

    this.sprite.texture = tex;

    if (state === "prominent") {
      this.startPulse();
    } else {
      this.stopPulse();
      this.alpha = 1;
    }
  }

  private startPulse() {
    if (this._pulseActive) return;
    this._pulseActive = true;
    let elapsed = 0;

    this._pulseTick = () => {
      if (this._isDestroyed) return;
      elapsed += Ticker.shared.deltaMS;
      // Gentle pulse between 0.7 and 1.0 opacity over 800ms cycle
      const t = (Math.sin((elapsed / 800) * Math.PI * 2) + 1) / 2;
      this.alpha = 0.7 + t * 0.3;
    };
    Ticker.shared.add(this._pulseTick);
  }

  private stopPulse() {
    if (this._pulseTick) {
      Ticker.shared.remove(this._pulseTick);
      this._pulseTick = undefined;
    }
    this._pulseActive = false;
    this.alpha = 1;
  }

  get buttonWidth() {
    return SwapButton.WIDTH;
  }

  get buttonHeight() {
    return SwapButton.HEIGHT;
  }

  override destroy(options?: any) {
    this._isDestroyed = true;
    this.stopPulse();
    super.destroy(options);
  }
}
