"use client";

import {
  CELL_H,
  CELL_W,
  CHUNK_COLS,
  CHUNK_H,
  CHUNK_ROWS,
  CHUNK_W,
} from "@/features/newDashboard/constants/constants";
import { Application, Texture, TilingSprite, Container, Sprite } from "pixi.js";
import { useEffect, useRef } from "react";

export default function PixiStage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const initedRef = useRef(false);

  useEffect(() => {
    const app = new Application();
    appRef.current = app;
    let cleanupFns: Array<() => void> = [];

    // ---- world state ----
    let camX = 0,
      camY = 0;
    let speed = 2000;
    let ring = 2; // chunk radius visible: (2r+1)^2 chunks
    let heavyMode = true; // more shapes per cell
    let lastCamChunkX = Infinity,
      lastCamChunkY = Infinity;

    // Sprites per chunk, keyed "cx,cy"
    const world = new Container();
    const chunks = new Map<string, Sprite>();

    // --- tiny helpers ---
    const key = (cx: number, cy: number) => `${cx},${cy}`;
    const floorDiv = (v: number, s: number) => Math.floor(v / s);

    // Simple, stable 2D hash (deterministic “random” per cell)
    function hash2(ix: number, iy: number): number {
      let x = (ix | 0) >>> 0;
      let y = (iy | 0) >>> 0;
      x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
      x ^= Math.imul(x ^ (x >>> 13), 0x9e3779b1);
      y = Math.imul(y ^ (y >>> 16), 0x85ebca6b);
      y ^= Math.imul(y ^ (y >>> 13), 0xc2b2ae35);
      let n = x ^ ((y << 16) | (y >>> 16));
      n ^= n >>> 16;
      n = Math.imul(n, 0x7feb352d);
      n ^= n >>> 15;
      n = Math.imul(n, 0x846ca68b);
      n ^= n >>> 16;
      return n >>> 0;
    }

    // Draw one cell’s random content onto a 2D ctx (no allocations in hot path)
    function drawCell(
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      cx: number,
      cy: number
    ) {
      const hval = hash2(cx, cy);
      // background (optional, very light)
      if ((hval & 3) === 0) {
        ctx.fillStyle = "#f7f7f7";
        ctx.fillRect(x, y, w, h);
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x, y, w, h);
      }
      // border
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + w - 0.5, y);
      ctx.lineTo(x + w - 0.5, y + h);
      ctx.moveTo(x, y + h - 0.5);
      ctx.lineTo(x + w, y + h - 0.5);
      ctx.stroke();

      // One or more random shapes (heavier load = more)
      const shapes = heavyMode ? 100 : 1;
      for (let i = 0; i < shapes; i++) {
        // pseudo-randoms from hash
        const r1 = ((hval >>> (i * 5)) & 1023) / 1023;
        const r2 = ((hval >>> (i * 9)) & 1023) / 1023;
        const r3 = ((hval >>> (i * 13)) & 1023) / 1023;
        const shape = (hval >>> (i * 3)) % 5; // 0..4

        const px = x + 8 + r1 * (w - 16);
        const py = y + 8 + r2 * (h - 16);
        const size = 10 + r3 * Math.min(w, h) * 0.5;

        // pastel-ish  color
        const hue = hval % 360;
        ctx.fillStyle = `hsl(${(hue + i * 37) % 360} 70% 60%)`;
        ctx.strokeStyle = "rgba(0,0,0,0.3)";

        switch (shape) {
          case 0: {
            // circle
            ctx.beginPath();
            ctx.arc(px, py, size * 0.35, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          case 1: {
            // rect
            const rw = size * 0.8,
              rh = size * 0.5;
            ctx.fillRect(px - rw / 2, py - rh / 2, rw, rh);
            break;
          }
          case 2: {
            // diamond
            const s = size * 0.45;
            ctx.beginPath();
            ctx.moveTo(px, py - s);
            ctx.lineTo(px + s, py);
            ctx.lineTo(px, py + s);
            ctx.lineTo(px - s, py);
            ctx.closePath();
            ctx.fill();
            break;
          }
          case 3: {
            // triangle
            const s = size * 0.55;
            ctx.beginPath();
            ctx.moveTo(px, py - s);
            ctx.lineTo(px + s, py + s);
            ctx.lineTo(px - s, py + s);
            ctx.closePath();
            ctx.fill();
            break;
          }
          case 4: {
            // plus sign
            const s = size * 0.35;
            ctx.fillRect(px - s / 6, py - s, s / 3, 2 * s);
            ctx.fillRect(px - s, py - s / 6, 2 * s, s / 3);
            break;
          }
        }
      }
    }

    // Build a whole chunk into a single Canvas → Texture → Sprite (1 display object per chunk)
    function buildChunkSprite(cx: number, cy: number, renderer: Application["renderer"]): Sprite {
      const canvas = document.createElement("canvas");
      canvas.width = CHUNK_W;
      canvas.height = CHUNK_H;
      const ctx = canvas.getContext("2d", { alpha: false })!;
      // cell world indices for this chunk
      const startCellX = cx * CHUNK_COLS;
      const startCellY = cy * CHUNK_ROWS;

      // Draw cells
      for (let row = 0; row < CHUNK_ROWS; row++) {
        for (let col = 0; col < CHUNK_COLS; col++) {
          const sx = col * CELL_W;
          const sy = row * CELL_H;
          drawCell(ctx, sx, sy, CELL_W, CELL_H, startCellX + col, startCellY + row);
        }
      }

      const texture = Texture.from(canvas);
      const sprite = new Sprite({ texture });
      sprite.x = cx * CHUNK_W;
      sprite.y = cy * CHUNK_H;
      return sprite;
    }

    function ensureVisibleChunks(centerCX: number, centerCY: number) {
      // create needed
      const needed = new Set<string>();
      for (let y = centerCY - ring; y <= centerCY + ring; y++) {
        for (let x = centerCX - ring; x <= centerCX + ring; x++) {
          const k = key(x, y);
          needed.add(k);
          if (!chunks.has(k)) {
            const spr = buildChunkSprite(x, y, app.renderer);
            chunks.set(k, spr);
            world.addChild(spr);
          }
        }
      }
      // remove old
      for (const [k, spr] of chunks) {
        if (!needed.has(k)) {
          chunks.delete(k);
          // free GPU + CPU
          const tex = spr.texture;
          spr.destroy({ children: false, texture: false, textureSource: false });
          tex.destroy(true); // destroy baseTexture too
        }
      }
    }

    (async () => {
      const host = hostRef.current;
      if (!host) return;

      await app.init({
        resizeTo: host,
        background: "#0e0e10",
        antialias: false,
        preference: "webgpu", // fallback to webgl if not supported
        powerPreference: "high-performance",
        resolution: Math.min(2, window.devicePixelRatio || 1), // cap to 2x if you want
        autoDensity: true,
      });
      if (appRef.current !== app) return;

      initedRef.current = true;
      host.appendChild(app.canvas);

      // background subtle tiler
      const pat = document.createElement("canvas");
      pat.width = CELL_W;
      pat.height = CELL_H;
      const pctx = pat.getContext("2d")!;
      pctx.fillStyle = "#ffffff";
      pctx.fillRect(0, 0, CELL_W, CELL_H);
      pctx.strokeStyle = "rgba(0,0,0,0.1)";
      pctx.beginPath();
      pctx.moveTo(CELL_W - 0.5, 0);
      pctx.lineTo(CELL_W - 0.5, CELL_H);
      pctx.moveTo(0, CELL_H - 0.5);
      pctx.lineTo(CELL_W, CELL_H - 0.5);
      pctx.stroke();
      const gridTex = Texture.from(pat);
      const grid = new TilingSprite({
        texture: gridTex,
        width: app.screen.width,
        height: app.screen.height,
      });
      app.stage.addChild(grid);

      // world container with chunk sprites
      app.stage.addChild(world);

      // keep background covering screen
      const onResize = () => {
        grid.width = app.screen.width;
        grid.height = app.screen.height;
      };
      (app.renderer as any).on?.("resize", onResize);
      cleanupFns.push(() => (app.renderer as any).off?.("resize", onResize));

      // input
      const keys = new Set<string>();
      const down = (e: KeyboardEvent) => {
        const k = e.key.toLowerCase();
        keys.add(k);
        if (k === "]") {
          ring = Math.min(4, ring + 1);
          lastCamChunkX = Infinity;
        } // force refresh
        if (k === "[") {
          ring = Math.max(1, ring - 1);
          lastCamChunkX = Infinity;
        }
        if (k === "r") {
          // rebuild visible chunks
          for (const spr of chunks.values()) {
            const tex = spr.texture;
            spr.destroy({ children: false, texture: false, textureSource: false });
            tex.destroy(true);
          }
          chunks.clear();
          lastCamChunkX = Infinity; // force refresh
        }
        if (k === "p") {
          heavyMode = !heavyMode;
          lastCamChunkX = Infinity;
        }
      };
      const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
      window.addEventListener("keydown", down);
      window.addEventListener("keyup", up);
      cleanupFns.push(() => {
        window.removeEventListener("keydown", down);
        window.removeEventListener("keyup", up);
      });

      // ticker
      let hudTimer = 0;
      app.ticker.add((t) => {
        const dt = t.deltaMS / 1000;

        // camera move
        let vx = 0,
          vy = 0;
        if (keys.has("arrowleft") || keys.has("a")) vx -= 1;
        if (keys.has("arrowright") || keys.has("d")) vx += 1;
        if (keys.has("arrowup") || keys.has("w")) vy -= 1;
        if (keys.has("arrowdown") || keys.has("s")) vy += 1;
        if (vx || vy) {
          const inv = 1 / Math.hypot(vx, vy);
          vx *= inv;
          vy *= inv;
        }
        camX += vx * speed * dt;
        camY += vy * speed * dt;

        // move world container & background tiler
        world.position.set(-camX, -camY);
        grid.tilePosition.set(camX, camY);

        // Ensure correct chunks loaded when camera crosses chunk boundary
        const camChunkX = floorDiv(camX, CHUNK_W);
        const camChunkY = floorDiv(camY, CHUNK_H);
        if (camChunkX !== lastCamChunkX || camChunkY !== lastCamChunkY) {
          lastCamChunkX = camChunkX;
          lastCamChunkY = camChunkY;
          ensureVisibleChunks(camChunkX, camChunkY);
        }

        // HUD (update ~4x/sec)
        hudTimer += t.deltaMS;
        if (hudTimer > 250 && hudRef.current) {
          hudTimer = 0;
          const cells = (2 * ring + 1) * (2 * ring + 1) * CHUNK_COLS * CHUNK_ROWS;
          hudRef.current.textContent = `FPS ${app.ticker.FPS.toFixed(1)} | ring ${ring} | chunks ${
            chunks.size
          } | cells ${cells} | heavy ${heavyMode ? "on" : "off"}`;
        }
      });

      // first fill
      ensureVisibleChunks(0, 0);
    })();

    return () => {
      const app = appRef.current;
      appRef.current = null;

      // clean listeners first
      cleanupFns.forEach((fn) => fn());

      // destroy chunks & textures
      for (const spr of Array.from((chunks as any).values?.() ?? [])) {
        const tex = (spr as Sprite).texture;
        (spr as Sprite).destroy({ children: false, texture: false, textureSource: false });
        tex.destroy(true);
      }
      chunks.clear();

      if (app && initedRef.current && (app as any).renderer) {
        app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
      }
    };
  }, []);

  // Host fills the available area from your layout (no scrollbars)
  return (
    <div ref={hostRef} className="relative w-full h-full">
      <div
        ref={hudRef}
        className="absolute top-2 left-2 px-2 py-1 rounded bg-black/50 text-white text-xs font-mono select-none"
      />
    </div>
  );
}
