import { Container, Sprite, Text } from "pixi.js";
// import { RenderTexture } from "pixi.js";
import { Baker } from "../util/Baker";
import { Bleacher } from "../db/client/bleachers";
import { BLEACHER_COLUMN_WIDTH, CELL_HEIGHT } from "../values/constants";

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
  private baker: Baker;

  /**
   * Creates a cell that renders to a single `Sprite` using textures from `baker`.
   * @param baker - Shared `Baker` instance that caches baked `RenderTexture`s.
   */
  constructor(baker: Baker) {
    super();
    this.baker = baker;

    this.sprite = new Sprite();
    this.sprite.eventMode = "none";
    this.addChild(this.sprite);
    this.eventMode = "none";
  }

  /**
   * Sets the bleacher content for this cell.
   * On cache miss, uses the shared {@link Baker} to **bake** the label into a
   * `RenderTexture`; on hit, reuses the cached texture. Either way, the sprite’s
   * texture is swapped—no live `Text` objects remain in the scene.
   *
   * @param b - Bleacher data model for this row.
   */
  setBleacher(b: Bleacher) {
    const key = b.bleacherNumber;

    // Builds each cell once and stores as a texture in memory
    const rt = this.baker.getTexture(
      key,
      { width: BLEACHER_COLUMN_WIDTH, height: CELL_HEIGHT },
      (c) => this.buildBleacherContainer(c, b)
    );

    this.sprite.texture = rt;
  }

  /**
   * Builds the offscreen display hierarchy used for baking this cell’s texture.
   * This runs **only on cache miss**; the container is destroyed after rendering.
   * @param c - Offscreen container to populate with display objects.
   * @param b - Bleacher data to render.
   * @internal
   */
  private buildBleacherContainer(c: Container, b: Bleacher) {
    const bleacherNumber = new Text({
      text: String(b.bleacherNumber),
      style: { fill: 0xf0b000, fontSize: 16, fontWeight: "bold" },
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

    const summerHomeBase = new Text({
      text: b.summerHomeBase ?? "",
      style: { fill: 0xfe9900, fontSize: 11 },
    });
    summerHomeBase.position.set(3, 30);

    const winterHomeBase = new Text({
      text: b.winterHomeBase ?? "",
      style: { fill: 0x2b80ff, fontSize: 11 },
    });
    // place winter right after summer
    winterHomeBase.position.set(3 + Math.ceil(summerHomeBase.width) + 5, 30);

    c.addChild(bleacherNumber, bleacherRows, bleacherSeats, summerHomeBase, winterHomeBase);
  }
}
