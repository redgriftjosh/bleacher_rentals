// import { Application, Container, Graphics, Text, Sprite } from "pixi.js";
// import { Baker } from "../util/Baker";

// export type AssetState = {
//   row: number;
//   col: number;
//   isMouseHovering?: boolean;
//   isScrolling?: boolean;
//   scrollX?: number;
//   scrollY?: number;
// };

// export type RenderMode = "static" | "dynamic";

// export interface IAsset {
//   shouldBeStatic(state: AssetState): boolean;
//   render(state: AssetState, mode: RenderMode): Container;
//   getAssetId(): string;
// }

// /**
//  * Simple demo asset that changes behavior based on state
//  * Shows a blue square that turns green when dynamic (hovered)
//  */
// export class DemoAsset implements IAsset {
//   private app: Application;
//   private baker: Baker;

//   constructor(app: Application, baker: Baker) {
//     this.app = app;
//     this.baker = baker;
//   }

//   shouldBeStatic(state: AssetState): boolean {
//     // Be dynamic (live) when hovering, static otherwise
//     return !state.isMouseHovering;
//   }

//   getAssetId(): string {
//     return "demo-asset";
//   }

//   render(state: AssetState, mode: RenderMode): Container {
//     const container = new Container();

//     if (mode === "static") {
//       // Static mode: Create a simple blue square using baker
//       const cacheKey = `demo-static:${state.row}:${state.col}`;
//       const texture = this.baker.getTexture(
//         cacheKey,
//         { width: 100, height: 50 },
//         (buildContainer) => {
//           const bg = new Graphics();
//           bg.rect(0, 0, 100, 50).fill(0x3366cc); // Blue

//           const label = new Text({
//             text: "STATIC",
//             style: { fill: 0xffffff, fontSize: 12, fontWeight: "bold" },
//           });
//           label.anchor.set(0.5);
//           label.position.set(50, 25);

//           buildContainer.addChild(bg, label);
//         }
//       );

//       const sprite = new Sprite(texture);
//       container.addChild(sprite);
//     } else {
//       // Dynamic mode: Create live graphics that can change
//       const bg = new Graphics();
//       bg.rect(0, 0, 100, 50).fill(0x33cc66); // Green when dynamic

//       const label = new Text({
//         text: "DYNAMIC",
//         style: { fill: 0xffffff, fontSize: 12, fontWeight: "bold" },
//       });
//       label.anchor.set(0.5);
//       label.position.set(50, 25);

//       // Add some animation or interactivity
//       const time = Date.now() * 0.001;
//       label.y = 25 + Math.sin(time * 3) * 2; // Gentle bobbing animation

//       container.addChild(bg, label);
//     }

//     return container;
//   }
// }
