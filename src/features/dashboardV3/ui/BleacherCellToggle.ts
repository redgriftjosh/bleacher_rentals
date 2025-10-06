import { Container, Sprite, Graphics, Ticker } from "pixi.js";
import { Baker } from "../util/Baker";

// Mode for the toggle button
export type ToggleMode = "plus" | "minus";

/**
 * A small plus / minus toggle button used inside a BleacherCell.
 * Bakes its graphics via the shared Baker for performance.
 */
export class BleacherCellToggle extends Container {
  private sprite: Sprite;
  private size: number = 22;
  private baker: Baker;
  private _mode: ToggleMode | null = null;
  private _isDestroyed = false;

  constructor(baker: Baker) {
    super();
    this.baker = baker;
    this.sprite = new Sprite();
    this.sprite.anchor.set(0.5);
    this.sprite.position.set(this.size / 2, this.size / 2);
    this.addChild(this.sprite);

    this.eventMode = "static";
    this.cursor = "pointer";

    this.on("pointerover", () => this.sprite.scale.set(1.06));
    this.on("pointerout", () => this.sprite.scale.set(1));
  }

  setMode(mode: ToggleMode) {
    if (mode === this._mode && this.sprite.texture) return;
    this._mode = mode;

    const key = `PlusButton:${mode}:v2`;
    const tex = this.baker.getTexture(key, { width: this.size, height: this.size }, (c) => {
      const g = new Graphics();
      const border = mode === "plus" ? 0x16a34a : 0xdc2626; // green-600 / red-600
      const bg = mode === "plus" ? 0xf0fdf4 : 0xfef2f2; // green-50 / red-50
      const fg = border;
      const radius = 4;

      g.roundRect(0, 0, this.size, this.size, radius)
        .fill(bg)
        .stroke({ width: 1, color: border, alignment: 1 });
      c.addChild(g);

      const icon = new Graphics();
      const cx = this.size / 2;
      const cy = this.size / 2;
      const arm = Math.floor(this.size * 0.28);
      const th = Math.max(2, Math.floor(this.size * 0.16));
      // horizontal
      icon.rect(cx - arm, cy - th / 2, arm * 2, th).fill(fg);
      if (mode === "plus") {
        icon.rect(cx - th / 2, cy - arm, th, arm * 2).fill(fg);
      }
      c.addChild(icon);
    });
    this.sprite.texture = tex;
  }

  animateX(to: number, durationMs = 220) {
    if (this._isDestroyed) return;
    const start = this.x;
    const diff = to - start;
    if (diff === 0) return;

    let elapsed = 0;
    const tick = () => {
      elapsed += Ticker.shared.deltaMS;
      const p = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      if (!this._isDestroyed) {
        this.x = start + diff * eased;
      }
      if (p >= 1) Ticker.shared.remove(tick);
    };
    Ticker.shared.add(tick);
  }

  get buttonSize() {
    return this.size;
  }

  override destroy(options?: any) {
    this._isDestroyed = true;
    super.destroy(options);
  }
}
