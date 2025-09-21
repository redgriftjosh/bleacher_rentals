import { Application, Container, RenderTexture } from "pixi.js";

/**
 * Bakes arbitrary Pixi display content into a cached {@link RenderTexture}
 * so it only needs to be drawn once, then reused (e.g., via a `Sprite`).
 *
 * Use this to turn text-heavy or vector-heavy UI into a single texture to
 * slash per-frame CPU (text layout/rasterization) and GPU (draw calls).
 *
 * @example
 * ```ts
 * const baker = new Baker(app);
 * const tex = baker.getTexture(
 *   `bleacher:${b.id}`,
 *   { width: BLEACHER_COLUMN_WIDTH, height: CELL_HEIGHT },
 *   (c) => {
 *     const title = new Text(b.name, { fontSize: 12 });
 *     title.position.set(4, 4);
 *     c.addChild(title);
 *   }
 * );
 * sprite.texture = tex; // transparent where nothing was drawn
 * ```
 *
 * @remarks
 * - Returned textures are **transparent** where you don’t draw; the target is
 *   cleared before rendering.
 * - Results are cached by `key` until you call {@link invalidate} or {@link destroyAll}.
 * - The `build` callback should be **pure**: populate only the provided
 *   container. It is destroyed (with children) after baking.
 *
 * @public
 */
export class Baker {
  private app: Application;
  private cache = new Map<string | number, RenderTexture>();
  private static allInstances = new Set<Baker>();

  /**
   * Creates a new baker bound to the renderer in `app`.
   * @param app - Pixi application whose renderer will be used for baking.
   */
  constructor(app: Application) {
    this.app = app;
    Baker.allInstances.add(this);
  }

  /**
   * Returns a cached {@link RenderTexture} for `key`, or builds it once by
   * rendering the content produced by `build(container)` into a texture of
   * the requested `size`.
   *
   * @param key - Stable, unique cache key (include theme/version if styles change).
   * @param size - Target texture dimensions in CSS pixels (resolution is handled).
   * @param build - Callback that populates the provided offscreen `Container`
   *   with any display objects to be baked.
   * @returns The baked (and cached) RenderTexture.
   */
  getTexture(
    key: string | number,
    size: { width: number; height: number },
    build: (container: Container) => void
  ) {
    const existing = this.cache.get(key);
    if (existing && !existing.destroyed) return existing;

    // Remove destroyed texture from cache if it exists
    if (existing && existing.destroyed) {
      this.cache.delete(key);
    }

    // Check if renderer is still valid
    if (!this.app.renderer) {
      console.warn("Baker: Cannot create texture, renderer is null");
      return RenderTexture.create({ width: size.width, height: size.height });
    }

    try {
      // Build offscreen content and render once
      const off = new Container();
      build(off);

      const rt = RenderTexture.create({
        width: size.width,
        height: size.height,
        resolution: this.app.renderer.resolution,
      });

      this.app.renderer.render({ container: off, target: rt, clear: true });
      off.destroy({ children: true });

      this.cache.set(key, rt);
      return rt;
    } catch (error) {
      console.warn("Baker: Error creating texture:", error);
      // Return a fallback texture
      return RenderTexture.create({ width: size.width, height: size.height });
    }
  }

  /**
   * Removes a single cached texture by `id`. The texture is destroyed; the
   * next `getTexture` for the same key will re-bake it.
   * @param id - Cache key previously passed to {@link getTexture}.
   */
  invalidate(id: string | number) {
    const rt = this.cache.get(id);
    if (rt) {
      rt.destroy(true);
      this.cache.delete(id);
    }
  }

  /**
   * Destroys all cached textures and clears the cache.
   * Call this on teardown or when switching themes/fonts globally.
   */
  destroyAll() {
    try {
      for (const rt of this.cache.values()) {
        if (rt && !rt.destroyed) {
          rt.destroy(true);
        }
      }
    } catch (error) {
      console.warn("Error destroying Baker cache:", error);
    }
    this.cache.clear();
    Baker.allInstances.delete(this);
  }

  /**
   * Destroys all Baker instances and their caches.
   * Call this when recreating the PIXI app to prevent stale references.
   */
  static destroyAllInstances() {
    try {
      for (const baker of Baker.allInstances) {
        baker.destroyAll();
      }
      Baker.allInstances.clear();
    } catch (error) {
      console.warn("Error destroying all Baker instances:", error);
    }
  }
}
