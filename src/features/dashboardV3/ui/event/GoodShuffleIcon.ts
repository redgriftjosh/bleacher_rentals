import { Graphics, Sprite, Texture, Assets, TextureSource } from "pixi.js";
import { Baker } from "../../util/Baker";
import { PngManager } from "../../util/PngManager";

export class GoodShuffleIcon extends Sprite {
  constructor(baker: Baker) {
    super();

    // Check if GSLogo is already cached
    const cachedTexture = PngManager.getTexture("GSLogo");

    if (cachedTexture) {
      // Use cached texture immediately
      this.createTextureFromLoaded(baker, cachedTexture);
    } else {
      // Start with fallback and try to load
      this.createFallbackTexture(baker);
      this.loadAndReplaceTexture(baker);
    }
  }

  private createTextureFromLoaded(baker: Baker, logoTexture: Texture) {
    const texture = baker.getTexture(`GoodShuffleIcon-loaded`, null, (c) => {
      const logoSprite = new Sprite(logoTexture);
      logoSprite.width = 16;
      logoSprite.height = 16;
      c.addChild(logoSprite);
      console.log("GoodShuffleIcon created from scratch");
    });

    this.texture = texture;
    this.position.set(-5, -20);
    // console.log("GoodShuffleIcon created with cached texture");
  }

  private createFallbackTexture(baker: Baker) {
    const fallbackTexture = baker.getTexture(
      `GoodShuffleIcon-fallback`,
      { width: 16, height: 16 },
      (c) => {
        const fallbackGraphics = new Graphics();
        fallbackGraphics.fill({ color: 0x4a90e2 }); // Nice blue color
        fallbackGraphics.roundRect(0, 0, 16, 16, 3); // Rounded rectangle
        fallbackGraphics.fill();
        c.addChild(fallbackGraphics);
      }
    );

    this.texture = fallbackTexture;
    console.log("GoodShuffleIcon created with fallback texture");
  }

  private async loadAndReplaceTexture(baker: Baker) {
    try {
      console.log("Loading GSLogo.png with Assets API...");
      const imagePath = `${window.location.origin}/GSLogo.png`;
      const logoTexture = await Assets.load("http://localhost:3000/GSLogo.png");
      console.log("Logo texture loaded successfully");

      // Create the new texture with the loaded image
      const newTexture = baker.getTexture(
        `GoodShuffleIcon-loaded`,
        { width: 16, height: 16 },
        (c) => {
          const logoSprite = new Sprite(logoTexture);
          logoSprite.width = 16;
          logoSprite.height = 16;
          logoSprite.position.set(0, 0);
          logoSprite.anchor.set(0, 0);
          c.addChild(logoSprite);
        }
      );

      // Replace the fallback texture with the real one
      this.texture = newTexture;
      console.log("GoodShuffleIcon texture replaced with loaded image");
    } catch (error) {
      console.error("Failed to load GSLogo.png, keeping fallback:", error);
    }
  }
}
