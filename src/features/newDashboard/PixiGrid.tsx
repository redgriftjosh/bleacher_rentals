"use client";

import { Application, Texture, TilingSprite, Container } from "pixi.js";
import { useEffect, useRef } from "react";

/**
 * Tweak these to taste
 */
const ROWS = 400;
const COLS = 1500;
const CELL_W = 120; // CSS pixels per column
const CELL_H = 28; // CSS pixels per row

export default function PixiGrid() {
  const hostRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const app = new Application();
    let cleanupFns: Array<() => void> = [];

    // camera (top-left of viewport in world coords)
    let camX = 0,
      camY = 0;

    // mouse state for drag-to-scroll
    let dragging = false;
    let dragStartX = 0,
      dragStartY = 0;
    let camStartX = 0,
      camStartY = 0;

    // world (finite)
    const worldW = COLS * CELL_W;
    const worldH = ROWS * CELL_H;

    (async () => {
      const host = hostRef.current;
      if (!host) return;

      await app.init({
        resizeTo: host,
        background: "#0e0e10",
        antialias: false,
        powerPreference: "high-performance",
        // make things crisp on Retina but cap at 2x so textures aren’t huge
        resolution: Math.min(2, window.devicePixelRatio || 1),
        autoDensity: true,
        // webgpu or webgl both work; let Pixi decide
      });

      host.appendChild(app.canvas);

      // ===== Grid pattern (procedural, DPR-aware) =====
      const dpr = app.renderer.resolution ?? 1;
      const pat = document.createElement("canvas");
      pat.width = Math.max(1, Math.floor(CELL_W * dpr));
      pat.height = Math.max(1, Math.floor(CELL_H * dpr));
      const pctx = pat.getContext("2d")!;
      pctx.scale(dpr, dpr);

      // white cell background
      pctx.fillStyle = "#ffffff";
      pctx.fillRect(0, 0, CELL_W, CELL_H);
      // hairline grid on right & bottom edges (like spreadsheets)
      pctx.strokeStyle = "rgba(0,0,0,0.12)";
      pctx.lineWidth = 1;
      pctx.beginPath();
      pctx.moveTo(CELL_W - 0.5, 0);
      pctx.lineTo(CELL_W - 0.5, CELL_H);
      pctx.moveTo(0, CELL_H - 0.5);
      pctx.lineTo(CELL_W, CELL_H - 0.5);
      pctx.stroke();

      // create a Pixi texture that knows its resolution (crisp!)
      const gridTex = Texture.from(pat);
      gridTex.baseTexture.resolution = dpr;
      gridTex.baseTexture.update();

      // A TilingSprite the size of the viewport; we’ll scroll it by changing tilePosition
      const grid = new TilingSprite({
        texture: gridTex,
        width: app.screen.width,
        height: app.screen.height,
      });
      app.stage.addChild(grid);

      // A container for “world” things (kept for future: headers, selection, etc.)
      const world = new Container();
      app.stage.addChild(world);

      // keep tiler covering the screen on resize
      const onResize = () => {
        grid.width = app.screen.width;
        grid.height = app.screen.height;
        clampCamera(); // if viewport grows, clamp again
        updateView();
      };
      (app.renderer as any).on?.("resize", onResize);
      cleanupFns.push(() => (app.renderer as any).off?.("resize", onResize));

      // ===== Input: wheel to scroll (trackpad supported) =====
      const onWheel = (e: WheelEvent) => {
        // Prevent the page from scrolling
        e.preventDefault();

        // Natural scrolling: deltaY > 0 means scroll down
        // Scale by 1 (trackpad) or more; tailor as you like
        const scale = 1;
        camX += e.deltaX * scale;
        camY += e.deltaY * scale;

        clampCamera();
        updateView();
      };
      host.addEventListener("wheel", onWheel, { passive: false });
      cleanupFns.push(() => host.removeEventListener("wheel", onWheel));

      // ===== Input: click-drag to scroll =====
      const onPointerDown = (e: PointerEvent) => {
        dragging = true;
        host.setPointerCapture(e.pointerId);
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        camStartX = camX;
        camStartY = camY;
      };
      const onPointerMove = (e: PointerEvent) => {
        if (!dragging) return;
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        // invert so dragging moves content like a spreadsheet
        camX = camStartX - dx;
        camY = camStartY - dy;
        clampCamera();
        updateView();
      };
      const onPointerUp = (e: PointerEvent) => {
        dragging = false;
        try {
          host.releasePointerCapture(e.pointerId);
        } catch {}
      };
      host.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      cleanupFns.push(() => {
        host.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      });

      // ===== Keyboard arrow keys (optional) =====
      const keys = new Set<string>();
      const down = (e: KeyboardEvent) => {
        keys.add(e.key.toLowerCase());
      };
      const up = (e: KeyboardEvent) => {
        keys.delete(e.key.toLowerCase());
      };
      window.addEventListener("keydown", down);
      window.addEventListener("keyup", up);
      cleanupFns.push(() => {
        window.removeEventListener("keydown", down);
        window.removeEventListener("keyup", up);
      });

      // animate only to support key-based scrolling + HUD; wheel/drag updates immediately
      app.ticker.add((t) => {
        const dt = t.deltaMS / 1000;
        if (keys.size) {
          const speed = 800; // px/sec
          let vx = 0,
            vy = 0;
          if (keys.has("arrowleft")) vx -= 1;
          if (keys.has("arrowright")) vx += 1;
          if (keys.has("arrowup")) vy -= 1;
          if (keys.has("arrowdown")) vy += 1;
          if (vx || vy) {
            const inv = 1 / Math.hypot(vx, vy);
            camX += vx * inv * speed * dt;
            camY += vy * inv * speed * dt;
            clampCamera();
            updateView();
          }
        }
        // HUD ~4x/sec
        hudTimer += t.deltaMS;
        if (hudTimer > 250 && hudRef.current) {
          hudTimer = 0;
          const visCols = Math.ceil(app.screen.width / CELL_W);
          const visRows = Math.ceil(app.screen.height / CELL_H);
          const col0 = Math.floor(camX / CELL_W);
          const row0 = Math.floor(camY / CELL_H);
          hudRef.current.textContent = `cam (${camX | 0},${camY | 0}) | rows ${row0}–${Math.min(
            ROWS - 1,
            row0 + visRows
          )} / ${ROWS - 1} | cols ${col0}–${Math.min(COLS - 1, col0 + visCols)} / ${COLS - 1}`;
        }
      });
      let hudTimer = 0;

      // ===== helpers =====
      function clampCamera() {
        const maxX = Math.max(0, worldW - app.screen.width);
        const maxY = Math.max(0, worldH - app.screen.height);
        camX = Math.min(maxX, Math.max(0, camX));
        camY = Math.min(maxY, Math.max(0, camY));
      }

      function updateView() {
        // Move the tiling grid
        grid.tilePosition.set(camX, camY);
        // If you add world children later, move the world too:
        world.position.set(-camX, -camY);
        // (Right now world is empty; we keep it for future content.)
      }

      // initial
      clampCamera();
      updateView();
    })();

    return () => {
      cleanupFns.forEach((fn) => fn());
      try {
        app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
      } catch {}
    };
  }, []);

  return (
    <div ref={hostRef} className="relative w-full h-full select-none">
      <div
        ref={hudRef}
        className="absolute top-2 left-2 px-2 py-1 rounded bg-black/50 text-white text-xs font-mono"
      />
    </div>
  );
}
