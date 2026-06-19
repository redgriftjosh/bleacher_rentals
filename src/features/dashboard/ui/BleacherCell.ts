import { Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { Baker } from "../util/Baker";
import { BleacherCellToggle } from "./BleacherCellToggle";
import { SwapButton, SwapButtonState } from "./SwapButton";
import { BLEACHER_COLUMN_WIDTH, CELL_HEIGHT } from "../values/constants";
import { Bleacher } from "../types";
import { MapPinIcon } from "./event/MapPinIcon";
import { PngManager } from "../util/PngManager";

/**
 * A lightweight, scroll-friendly **row widget** for the sticky left column.
 *
 * At runtime, `BleacherCell` is just a `Sprite` whose texture comes from a shared
 * {@link Baker} cache. The text-heavy layout (number, rows, seats, summer/winter bases)
 * is rendered **once** into a {@link RenderTexture} and then reused—eliminating per-frame
 * text rasterization and keeping scrolling silky-smooth.
 *
 * @example
 * ```ts
 * const baker = new Baker(app);               // shared per view
 * const cell = new BleacherCell(baker);      // one per visible row
 * cell.x = 0; cell.y = rowIndex * CELL_HEIGHT;
 * cell.setBleacher(bleachers[rowIndex]);     // bakes on cache miss, else reuses
 * container.addChild(cell);
 * ```
 *
 * @remarks
 * - The baked texture is **transparent** wherever nothing is drawn; it composites
 *   cleanly over your grid background.
 * - The cache key used in {@link setBleacher} is `bleacherNumber` by default. Prefer a
 *   **stable unique id** (e.g., `bleacherId`) or include a theme/version suffix if fonts
 *   or colors can change (e.g., `"bleacher:123:v2"`).
 * - Building happens only on cache miss; the offscreen container created in
 *   {@link buildBleacherContainer} is destroyed immediately after baking.
 *
 * @see {@link Baker} for cache management, invalidation, and teardown.
 * @since 1.0.0
 */
export class BleacherCell extends Container {
  private sprite: Sprite;
  private bg: Graphics;
  private baker: Baker;
  private bleacherUuid?: string; // reuse-safe id
  private toggle: BleacherCellToggle; // added toggle
  private swapButton: SwapButton; // swap button
  private mapPinIcon: MapPinIcon; // added map pin icon
  private onToggle?: (bleacherUuid: string) => void;
  private onMapPinClick?: (bleacherUuid: string) => void;
  private onSwap?: (bleacherUuid: string) => void;

  // Map bleacherRows to Tailwind-like colors:
  // 7 -> green-700 (#15803d), 10 -> red-700 (#b91c1c), 15 -> yellow-500 (#eab308), else black
  private getBleacherNumberColor(rows?: number, isAccessible: boolean = true): number {
    const colors: Record<number, number> = {
      7: 0x15803d, // green-700
      10: 0xb91c1c, // red-700
      15: 0xeab308, // yellow-500
    };
    const color = rows != null && rows in colors ? colors[rows] : 0x000000;
    return isAccessible ? color : this.desaturateColor(color, 0.4);
  }

  /** Desaturate a hex color by blending toward grey. amount: 0 = no change, 1 = full greyscale */
  private desaturateColor(hex: number, amount: number = 0.75): number {
    const r = (hex >> 16) & 0xff;
    const g = (hex >> 8) & 0xff;
    const b = hex & 0xff;
    const grey = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
    const mix = (c: number) => Math.round(c * (1 - amount) + grey * amount);
    return (mix(r) << 16) | (mix(g) << 8) | mix(b);
  }

  /**
   * Creates a cell that renders to a single `Sprite` using textures from `baker`.
   * @param baker - Shared `Baker` instance that caches baked `RenderTexture`s.
   */
  constructor(baker: Baker) {
    super();
    this.baker = baker;

    this.bg = new Graphics();
    this.bg.rect(0, 0, BLEACHER_COLUMN_WIDTH, CELL_HEIGHT).fill({ color: 0x000000, alpha: 0.1 });
    this.bg.visible = false;
    this.addChild(this.bg);

    this.sprite = new Sprite();
    this.addChild(this.sprite);

    // toggle setup
    this.toggle = new BleacherCellToggle(baker);
    this.toggle.setMode("plus");
    const pad = 6;
    this.toggle.x = BLEACHER_COLUMN_WIDTH - this.toggle.buttonSize - pad;
    this.toggle.y = Math.max(2, (CELL_HEIGHT - this.toggle.buttonSize) / 2 - 2);
    this.toggle.visible = false;
    this.addChild(this.toggle);

    this.toggle.on("pointertap", () => {
      if (this.bleacherUuid != null && this.onToggle) this.onToggle(this.bleacherUuid);
    });

    // swap button setup - positioned just left of the toggle button
    this.swapButton = new SwapButton(baker);
    this.swapButton.x = this.toggle.x - this.swapButton.buttonWidth - 4;
    this.swapButton.y = Math.max(2, (CELL_HEIGHT - this.swapButton.buttonHeight) / 2 - 2);
    this.swapButton.visible = false;
    this.addChild(this.swapButton);

    this.swapButton.on("pointertap", () => {
      if (this.bleacherUuid != null && this.onSwap) this.onSwap(this.bleacherUuid);
    });

    // map pin icon setup
    this.mapPinIcon = new MapPinIcon(baker, () => {
      if (this.bleacherUuid != null && this.onMapPinClick) this.onMapPinClick(this.bleacherUuid);
    });
    // Position it to the right of the bleacher number text
    // Bleacher number is at (3, 2), roughly 16px font + some width
    // Position map pin at approximately x: 30, y: 4 (vertically centered with number)
    this.mapPinIcon.x = 35;
    this.mapPinIcon.y = 12;
    this.mapPinIcon.visible = true;
    this.mapPinIcon.scale.set(0.5, 0.5); // scale down if needed
    this.addChild(this.mapPinIcon);
  }

  /**
   * Sets the bleacher content for this cell.
   * On cache miss, uses the shared {@link Baker} to **bake** the label into a
   * `RenderTexture`; on hit, reuses the cached texture. Either way, the sprite's
   * texture is swapped—no live `Text` objects remain in the scene.
   *
   * @param b - Bleacher data model for this row.
   */
  setBleacher(b: Bleacher, isAccessible: boolean = true) {
    this.bleacherUuid = b.bleacherUuid;
    // Include zoneUuid in the key so subrental rows (same bleacherUuid, different zone)
    // get their own texture rather than reusing the normal row's cached texture.
    const key = `${b.bleacherUuid}:${b.zoneUuid ?? "nz"}:${isAccessible ? "acc" : "noacc"}`;

    this.bg.visible = !isAccessible;

    // Show/hide map pin based on whether device is assigned
    this.mapPinIcon.visible = !!b.linxupDeviceId;

    // Builds each cell once and stores as a texture in memory
    const rt = this.baker.getTexture(
      key,
      { width: BLEACHER_COLUMN_WIDTH, height: CELL_HEIGHT },
      (c) => this.buildBleacherContainer(c, b, isAccessible),
    );

    this.sprite.texture = rt;
  }

  setToggleHandler(fn: (bleacherUuid: string) => void) {
    this.onToggle = fn;
  }

  setMapPinClickHandler(fn: (bleacherUuid: string) => void) {
    this.onMapPinClick = fn;
  }

  setFormExpanded(expanded: boolean) {
    if (!this.toggle) return; // defensive
    const targetX = expanded
      ? BLEACHER_COLUMN_WIDTH - this.toggle.buttonSize - 6
      : BLEACHER_COLUMN_WIDTH - this.toggle.buttonSize - 6 - 40;

    if (expanded) {
      if (!this.toggle.destroyed) {
        this.toggle.visible = true;
        this.toggle.animateX(targetX, 220);
      }
    } else {
      if (!this.toggle.destroyed) {
        this.toggle.x = targetX;
        this.toggle.visible = false;
      }
    }
  }

  setSelected(selected: boolean) {
    this.toggle.setMode(selected ? "minus" : "plus");
  }

  setSwapHandler(fn: (bleacherUuid: string) => void) {
    this.onSwap = fn;
  }

  setSwapState(state: SwapButtonState) {
    this.swapButton.setState(state);
  }

  /**
   * Builds the offscreen display hierarchy used for baking this cell's texture.
   * This runs **only on cache miss**; the container is destroyed after rendering.
   * @param c - Offscreen container to populate with display objects.
   * @param b - Bleacher data to render.
   * @internal
   */
  private buildBleacherContainer(c: Container, b: Bleacher, isAccessible: boolean = true) {
    const isSubrental = !!b.isSubrentalRow;

    const bleacherNumber = new Text({
      text: String(b.bleacherNumber),
      style: {
        fill: this.getBleacherNumberColor(b.bleacherRows, isAccessible),
        fontSize: 16,
        fontWeight: "bold",
      },
    });
    bleacherNumber.position.set(3, 2);

    const bleacherRows = new Text({
      text: `${b.bleacherRows}row`,
      style: { fill: 0x6b6b6b, fontSize: 11 },
    });
    bleacherRows.position.set(3, 18);

    const bleacherSeats = new Text({
      text: `${b.bleacherSeats}seats`,
      style: { fill: 0x6b6b6b, fontSize: 11 },
    });
    bleacherSeats.position.set(40, 18);

    if (isSubrental) {
      // For subrental rows: show the handshake icon next to the bleacher number
      // and display "OriginalZone → TargetZone" in place of just the zone name.
      const hsTexture = PngManager.getTexture("handshake");
      if (hsTexture) {
        const hsSprite = new Sprite(hsTexture);
        hsSprite.width = 14;
        hsSprite.height = 14;
        // Pin to the far right of the cell, vertically centered
        hsSprite.position.set(BLEACHER_COLUMN_WIDTH - 25, (CELL_HEIGHT - 14) / 2);
        c.addChild(hsSprite);
      }

      // Determine original zone name: look it up from the bleacher's own zone
      // The subrental row's subrentalEvents carry requestedZoneUuid == b.zoneUuid
      // The original zone is on the subrental event's bleacher (not stored here).
      // We store the target zone on the subrental row as zoneUuid/zoneName.
      // The original zone name is available via the first subrentalEvent's... we don't
      // have it directly, but we can show the target zone prominently with an arrow prefix.
      const zoneLabel = new Text({
        text: `${b.originalZoneName ?? ""} \u2192 ${b.zoneName ?? ""}`,
        style: { fill: 0xf0d000, fontSize: 11, fontWeight: "600" },
      });
      zoneLabel.position.set(3, 31);
      c.addChild(zoneLabel);
    } else {
      const zoneLabel = new Text({
        text: b.zoneName ?? "",
        style: { fill: 0x6b6b6b, fontSize: 11 },
      });
      zoneLabel.position.set(3, 31);
      c.addChild(zoneLabel);
    }

    c.addChild(bleacherNumber, bleacherRows, bleacherSeats);
  }
}
