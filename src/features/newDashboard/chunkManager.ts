"use client";

import { Texture, Sprite, Container, Renderer } from "pixi.js";
import { CELL_W, CELL_H, CHUNK_COLS, CHUNK_ROWS, CHUNK_W, CHUNK_H } from "./constants/constants";
import { drawCell } from "./drawCell";

/**
 * Messages exchanged with the Worker.
 * We pass an "epoch" so we can ignore stale responses after a rebuild.
 */
type BuildMsg = {
  type: "build";
  cx: number;
  cy: number;
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  heavy: boolean;
  epoch: number;
};
type BuiltMsg = {
  type: "built";
  cx: number;
  cy: number;
  bitmap: ImageBitmap; // from OffscreenCanvas.transferToImageBitmap()
  epoch: number;
};

/**
 * Utility: floor-divide by chunk size to get chunk coords from pixels.
 */
export const floorDiv = (v: number, s: number) => Math.floor(v / s);
const key = (cx: number, cy: number) => `${cx},${cy}`;

/**
 * ChunkManager
 *  - Maintains a cache of chunk Sprites (one sprite per chunk).
 *  - Requests missing chunks from a Worker (if supported).
 *  - Destroys chunks that fall outside the visible "ring".
 *  - Can "rebuild" (clear and regenerate) when heavyMode or cell art changes.
 */
export class ChunkManager {
  private world: Container;
  private renderer: Renderer;
  private chunks = new Map<string, Sprite>();
  private pending = new Set<string>();
  private worker: Worker | null = null;
  private epoch = 0; // increment to invalidate in-flight worker results

  constructor(world: Container, renderer: Renderer) {
    this.world = world;
    this.renderer = renderer;

    // Try to spin up the Worker. If it fails (e.g., old Safari), we'll fall back.
    try {
      this.worker = new Worker(
        new URL("../../../../app/(game)/play/chunk.worker.ts", import.meta.url),
        { type: "module" }
      );
      this.worker.onmessage = (e: MessageEvent) => this.onWorkerMessage(e.data as BuiltMsg);
    } catch {
      this.worker = null;
      console.warn("[ChunkManager] Worker unavailable; falling back to main-thread chunk builds.");
    }
  }

  /**
   * Ensure all chunks in [center - ring, center + ring] exist;
   * build any missing; remove those no longer needed.
   */
  ensureVisible(centerCX: number, centerCY: number, ring: number, heavy: boolean) {
    const needed = new Set<string>();

    for (let y = centerCY - ring; y <= centerCY + ring; y++) {
      for (let x = centerCX - ring; x <= centerCX + ring; x++) {
        const k = key(x, y);
        needed.add(k);
        if (!this.chunks.has(k) && !this.pending.has(k)) {
          this.requestChunk(x, y, heavy);
        }
      }
    }

    // Evict anything outside the needed set
    for (const [k, spr] of this.chunks) {
      if (!needed.has(k)) {
        this.chunks.delete(k);
        const tex = spr.texture;
        spr.destroy({ children: false, texture: false, textureSource: false });
        tex.destroy(true); // free GPU memory
      }
    }
  }

  /**
   * Nuke everything and bump epoch so stale worker responses are ignored.
   * Call this if you change heavyMode or the cell art parameters.
   */
  rebuildAll() {
    this.epoch++;
    for (const spr of this.chunks.values()) {
      const tex = spr.texture;
      spr.destroy({ children: false, texture: false, textureSource: false });
      tex.destroy(true);
    }
    this.chunks.clear();
    this.pending.clear();
  }

  /**
   * Destroy manager & free resources.
   */
  destroy() {
    this.rebuildAll();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  // --- internal ----

  /**
   * Ask the worker (if available) to build a chunk.
   * Fallback: build synchronously on the main thread.
   */
  private requestChunk(cx: number, cy: number, heavy: boolean) {
    const k = key(cx, cy);
    this.pending.add(k);

    if (this.worker && "OffscreenCanvas" in globalThis) {
      const msg: BuildMsg = {
        type: "build",
        cx,
        cy,
        cols: CHUNK_COLS,
        rows: CHUNK_ROWS,
        cellW: CELL_W,
        cellH: CELL_H,
        heavy,
        epoch: this.epoch,
      };
      this.worker.postMessage(msg);
      return;
    }

    // ---- fallback path (no worker / no OffscreenCanvas) ----
    const canvas = document.createElement("canvas");
    canvas.width = CHUNK_W;
    canvas.height = CHUNK_H;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    // top-left cell index in world for this chunk
    const startCellX = cx * CHUNK_COLS;
    const startCellY = cy * CHUNK_ROWS;

    for (let row = 0; row < CHUNK_ROWS; row++) {
      for (let col = 0; col < CHUNK_COLS; col++) {
        const sx = col * CELL_W;
        const sy = row * CELL_H;
        drawCell(ctx, sx, sy, CELL_W, CELL_H, startCellX + col, startCellY + row, heavy);
      }
    }

    const texture = Texture.from(canvas);
    const spr = new Sprite({ texture });
    spr.x = cx * CHUNK_W;
    spr.y = cy * CHUNK_H;
    this.world.addChild(spr);
    this.chunks.set(k, spr);
    this.pending.delete(k);
  }

  /**
   * Called when the Worker posts back an ImageBitmap for a built chunk.
   * We create a Texture, position a Sprite, and drop it in the world container.
   */
  private onWorkerMessage(msg: BuiltMsg) {
    // Ignore stale work from an older epoch (e.g., after rebuildAll / heavy toggle)
    if (msg.epoch !== this.epoch) {
      // The bitmap is GC'd; nothing to do.
      return;
    }

    const k = key(msg.cx, msg.cy);
    this.pending.delete(k);

    // Create a Pixi texture from the ImageBitmap without blocking decode work
    const texture = Texture.from(msg.bitmap);
    const spr = new Sprite({ texture });
    spr.x = msg.cx * CHUNK_W;
    spr.y = msg.cy * CHUNK_H;

    this.world.addChild(spr);
    this.chunks.set(k, spr);
  }
}
