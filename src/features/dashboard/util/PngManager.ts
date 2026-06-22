import { Application, Assets, RenderTexture, Sprite, Texture } from "pixi.js";
import { SUBRENTAL_COLOR } from "../values/constants";

/**
 * This class is responsible for loading png's and caching them.
 */
export class PngManager {
  // Make cache static so it's shared across all instances
  private static cache = new Map<string, Texture>();
  private static listeners = new Map<string, Set<(tex: Texture) => void>>();

  public static async fetchAndCachePng(app: Application) {
    await PngManager.loadAndCachePng(app, "/GSLogo.png", "GSLogo");
    await PngManager.loadAndCachePng(
      app,
      "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9Imx1Y2lkZSBsdWNpZGUtdHJ1Y2staWNvbiBsdWNpZGUtdHJ1Y2siPjxwYXRoIGQ9Ik0xNCAxOFY2YTIgMiAwIDAgMC0yLTJINGEyIDIgMCAwIDAtMiAydjExYTEgMSAwIDAgMCAxIDFoMiIvPjxwYXRoIGQ9Ik0xNSAxOEg5Ii8+PHBhdGggZD0iTTE5IDE4aDJhMSAxIDAgMCAwIDEtMXYtMy42NWExIDEgMCAwIDAtLjIyLS42MjRsLTMuNDgtNC4zNUExIDEgMCAwIDAgMTcuNTIgOEgxNCIvPjxjaXJjbGUgY3g9IjE3IiBjeT0iMTgiIHI9IjIiLz48Y2lyY2xlIGN4PSI3IiBjeT0iMTgiIHI9IjIiLz48L3N2Zz4=",
      "truck",
    );
    await PngManager.loadAndCachePng(app, "/map-pin.png", "map-pin");
    // Build handshake SVG dynamically so stroke color stays in sync with SUBRENTAL_COLOR
    const handshakeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${PngManager.toHexColor(SUBRENTAL_COLOR)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/></svg>`;
    await PngManager.loadAndCachePng(
      app,
      `data:image/svg+xml;base64,${btoa(handshakeSvg)}`,
      "handshake",
    );
  }

  public static getSprite(key: string): Sprite {
    const texture = PngManager.cache.get(key);
    if (texture) {
      return new Sprite(texture);
    }
    // console.log("Texture not found in cache:", key);
    // Return empty sprite as fallback
    return new Sprite();
  }

  public static getTexture(key: string): Texture | undefined {
    return PngManager.cache.get(key);
  }

  /**
   * Register a callback to run once the texture for `key` is loaded.
   * If already loaded, callback fires immediately.
   */
  public static onLoad(key: string, cb: (tex: Texture) => void) {
    const existing = PngManager.cache.get(key);
    if (existing) {
      cb(existing);
      return;
    }
    let set = PngManager.listeners.get(key);
    if (!set) {
      set = new Set();
      PngManager.listeners.set(key, set);
    }
    set.add(cb);
  }

  /**
   * Remove a previously registered callback.
   */
  public static offLoad(key: string, cb: (tex: Texture) => void) {
    const set = PngManager.listeners.get(key);
    if (set) {
      set.delete(cb);
      if (set.size === 0) PngManager.listeners.delete(key);
    }
  }

  private static async loadAndCachePng(app: Application, pngPath: string, key: string) {
    try {
      // console.log(`Loading PNG: ${pngPath} with key: ${key}`);

      // Load the texture using PixiJS Assets API
      const texture = await Assets.load(pngPath);
      // console.log(`Successfully loaded PNG: ${key}`, texture);

      // Cache the loaded texture (not a RenderTexture)
      PngManager.cache.set(key, texture);

      // Notify listeners waiting on this key
      const listeners = PngManager.listeners.get(key);
      if (listeners && listeners.size > 0) {
        for (const cb of listeners) {
          try {
            cb(texture);
          } catch (err) {
            console.error("PngManager listener error for key", key, err);
          }
        }
        PngManager.listeners.delete(key);
      }

      // console.log(`PNG cached with key: ${key}, cache size: ${PngManager.cache.size}`);
    } catch (error) {
      console.error(`Failed to load PNG ${pngPath}:`, error);
    }
  }

  // Optional: Method to preload multiple images
  public static async preloadImages(imagePaths: { path: string; key: string }[]) {
    const promises = imagePaths.map(({ path, key }) =>
      PngManager.loadAndCachePng(null as any, path, key),
    );
    await Promise.all(promises);
  }

  // Optional: Clear cache
  public static clearCache() {
    PngManager.cache.clear();
  }

  /** Convert a numeric hex color (e.g. 0xf0d000) to a CSS hex string (e.g. "#f0d000"). */
  private static toHexColor(n: number): string {
    return "#" + n.toString(16).padStart(6, "0");
  }

  // Optional: Check if image is cached
  public static isCached(key: string): boolean {
    return PngManager.cache.has(key);
  }
}
