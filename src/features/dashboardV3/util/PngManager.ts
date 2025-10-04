import { Application, Assets, RenderTexture, Sprite, Texture } from "pixi.js";

/**
 * This class is responsible for loading png's and caching them.
 */
export class PngManager {
  // Make cache static so it's shared across all instances
  private static cache = new Map<string, Texture>();

  public static async fetchAndCachePng(app: Application) {
    await PngManager.loadAndCachePng(app, "/GSLogo.png", "GSLogo");
  }

  public static getSprite(key: string): Sprite {
    const texture = PngManager.cache.get(key);
    if (texture) {
      return new Sprite(texture);
    }
    console.log("Texture not found in cache:", key);
    // Return empty sprite as fallback
    return new Sprite();
  }

  public static getTexture(key: string): Texture | undefined {
    return PngManager.cache.get(key);
  }

  private static async loadAndCachePng(app: Application, pngPath: string, key: string) {
    try {
      console.log(`Loading PNG: ${pngPath} with key: ${key}`);

      // Load the texture using PixiJS Assets API
      const texture = await Assets.load(pngPath);
      console.log(`Successfully loaded PNG: ${key}`, texture);

      // Cache the loaded texture (not a RenderTexture)
      PngManager.cache.set(key, texture);

      console.log(`PNG cached with key: ${key}, cache size: ${PngManager.cache.size}`);
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
