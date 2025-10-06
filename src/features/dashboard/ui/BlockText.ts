import { Container, Text, TextStyle } from "pixi.js";
import { BleacherBlock } from "../db/client/bleachers";
import { CELL_HEIGHT, CELL_WIDTH } from "../values/constants";

/**
 * PixiJS component to render block text in a cell, similar to BlockRenderer.tsx
 */
export class BlockText extends Container {
  private textObject: Text;
  private currentBlock: BleacherBlock | null = null;

  constructor() {
    super();

    // Create text style similar to BlockRenderer
    const style = new TextStyle({
      fontSize: 10,
      fill: 0x000000, // black text
      fontFamily: "Arial, sans-serif",
      align: "center",
      wordWrap: true,
      wordWrapWidth: CELL_WIDTH - 8, // account for padding
      breakWords: true,
    });

    this.textObject = new Text("", style);
    this.textObject.anchor.set(0.5); // center anchor
    this.addChild(this.textObject);

    // Position in center of cell
    this.textObject.position.set(CELL_WIDTH / 2, CELL_HEIGHT / 2);

    this.hide();
  }

  /**
   * Display block text in the cell
   */
  show(block: BleacherBlock, x: number, y: number) {
    if (this.destroyed) return;

    this.currentBlock = block;
    this.textObject.text = block.text || "";

    // Position the container
    this.position.set(x, y);
    this.visible = true;
  }

  /**
   * Hide the block text
   */
  hide() {
    if (this.destroyed) return;

    this.visible = false;
    this.currentBlock = null;
    this.textObject.text = "";
  }

  /**
   * Get the current block being displayed
   */
  getCurrentBlock(): BleacherBlock | null {
    return this.currentBlock;
  }

  /**
   * Update text content without changing position
   */
  updateText(text: string) {
    if (this.destroyed) return;

    this.textObject.text = text;
    if (this.currentBlock) {
      this.currentBlock.text = text;
    }
  }

  destroy(options?: Parameters<Container["destroy"]>[0]) {
    if (this.destroyed) return;

    this.currentBlock = null;

    if (
      this.textObject &&
      typeof this.textObject.destroy === "function" &&
      !this.textObject.destroyed
    ) {
      this.textObject.destroy();
    }

    super.destroy(options);
  }
}
