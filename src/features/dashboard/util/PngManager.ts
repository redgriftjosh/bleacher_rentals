import { Application, Assets, RenderTexture, Sprite, Texture } from "pixi.js";

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
      "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXRydWNrLWljb24gbHVjaWRlLXRydWNrIj48cGF0aCBkPSJNMTQgMThWNmEyIDIgMCAwIDAtMi0ySDRhMiAyIDAgMCAwLTIgMnYxMWExIDEgMCAwIDAgMSAxaDIiLz48cGF0aCBkPSJNMTUgMThIOSIvPjxwYXRoIGQ9Ik0xOSAxOGgyYTEgMSAwIDAgMCAxLTF2LTMuNjVhMSAxIDAgMCAwLS4yMi0uNjI0bC0zLjQ4LTQuMzVBMSAxIDAgMCAwIDE3LjUyIDhIMTQiLz48Y2lyY2xlIGN4PSIxNyIgY3k9IjE4IiByPSIyIi8+PGNpcmNsZSBjeD0iNyIgY3k9IjE4IiByPSIyIi8+PC9zdmc+",
      "truck"
    );
    await PngManager.loadAndCachePng(app, "/map-pin.png", "map-pin");
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
      PngManager.loadAndCachePng(null as any, path, key)
    );
    await Promise.all(promises);
  }

  // Optional: Clear cache
  public static clearCache() {
    PngManager.cache.clear();
  }

  // Optional: Check if image is cached
  public static isCached(key: string): boolean {
    return PngManager.cache.has(key);
  }
}
