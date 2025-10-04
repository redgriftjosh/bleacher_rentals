// import { Container } from "pixi.js";
// import { IAsset, AssetState, RenderMode } from "./DemoAsset";

// /**
//  * Simple asset manager for demo purposes
//  * Manages switching between static (baked) and dynamic (live) rendering
//  */
// export class AssetManager {
//   private assets: Map<string, IAsset> = new Map();
//   private renderedContainers: Map<string, Container> = new Map();
//   private currentStates: Map<string, AssetState> = new Map();
//   private currentModes: Map<string, RenderMode> = new Map();

//   addAsset(key: string, asset: IAsset): void {
//     this.assets.set(key, asset);
//   }

//   /**
//    * Update asset state and re-render if mode needs to change
//    */
//   updateAsset(key: string, newState: AssetState): Container | null {
//     const asset = this.assets.get(key);
//     if (!asset) return null;

//     const oldState = this.currentStates.get(key);
//     const oldMode = this.currentModes.get(key);

//     // Determine new mode
//     const newMode: RenderMode = asset.shouldBeStatic(newState) ? "static" : "dynamic";

//     // Check if we need to re-render
//     const needsRerender =
//       !oldState ||
//       newMode !== oldMode ||
//       this.hasSignificantStateChange(oldState, newState, newMode);

//     if (needsRerender) {
//       // Clean up old container
//       const oldContainer = this.renderedContainers.get(key);
//       if (oldContainer) {
//         oldContainer.destroy({ children: true });
//       }

//       // Render new container
//       const newContainer = asset.render(newState, newMode);

//       // Store state
//       this.currentStates.set(key, { ...newState });
//       this.currentModes.set(key, newMode);
//       this.renderedContainers.set(key, newContainer);

//       return newContainer;
//     }

//     // Return existing container if no re-render needed
//     return this.renderedContainers.get(key) || null;
//   }

//   /**
//    * Check if state changes require re-rendering
//    */
//   private hasSignificantStateChange(
//     oldState: AssetState,
//     newState: AssetState,
//     mode: RenderMode
//   ): boolean {
//     // For dynamic mode, we might want to re-render on every frame
//     if (mode === "dynamic") {
//       return true; // Always re-render dynamic assets for now
//     }

//     // For static mode, only re-render if position changes
//     return oldState.row !== newState.row || oldState.col !== newState.col;
//   }

//   /**
//    * Get current mode for debugging
//    */
//   getCurrentMode(key: string): RenderMode | undefined {
//     return this.currentModes.get(key);
//   }

//   /**
//    * Clean up all assets
//    */
//   destroy(): void {
//     this.renderedContainers.forEach((container) => {
//       container.destroy({ children: true });
//     });
//     this.assets.clear();
//     this.renderedContainers.clear();
//     this.currentStates.clear();
//     this.currentModes.clear();
//   }
// }
