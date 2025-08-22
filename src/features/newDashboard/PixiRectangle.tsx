"use client";

import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Sprite, Texture } from "pixi.js";
import { createRoundedRectNineSlice } from "./ui/roundedRectNineSlice";
import { initDevtools } from "@pixi/devtools";
import { createRoundedCard } from "./ui/roundedCard";

export default function PixiRectangle() {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const initedRef = useRef(false);

  useEffect(() => {
    const app = new Application();
    appRef.current = app;

    (async () => {
      const host = hostRef.current;
      if (!host) return;
      console.log("window.devicePixelRatio: ", window.devicePixelRatio);

      // Async init: don’t touch stage/canvas before this resolves
      await app.init({
        resizeTo: host,
        background: "#ffffff",
        // resolution: Math.min(2, window.devicePixelRatio || 1),
        resolution: window.devicePixelRatio,
        autoDensity: true,
        antialias: true,
      });
      initDevtools({ app });
      // Component might have unmounted during await:
      if (appRef.current !== app) return;

      initedRef.current = true;
      host.appendChild(app.canvas);

      const world = new Container();
      app.stage.addChild(world);
      const w = 240,
        h = 140,
        r = 8;
      const gapX = 24,
        gapY = 24;
      const startX = 60,
        startY = 60;

      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 3; col++) {
          const card = createRoundedCard(
            w,
            h,
            r,
            0x33aaff, // fill
            0x1f2a44 // border
          );
          card.position.set(startX + col * (w + gapX), startY + row * (h + gapY));
          world.addChild(card);
        }
      }

      // ===== Simple vertical scrollbar (track + draggable thumb) =====
      // app.renderer.roundPixels = true; // crisper motion

      // Compute content height (bottom of last row)
      const rows = 5;
      const contentHeight = startY + rows * h + (rows - 1) * gapY;
      let scrollY = 0;
      const wheelSpeed = 1.0;

      // Graphics for track & thumb
      const track = new Graphics();
      const thumb = new Graphics();
      track.alpha = 0.12; // subtle
      thumb.alpha = 0.6;

      track.eventMode = "none"; // non-interactive
      thumb.eventMode = "static"; // interactive
      thumb.cursor = "grab";

      app.stage.addChild(track, thumb);

      // Layout & update helpers
      const SB_W = 8; // scrollbar width
      const SB_PAD = 8; // margin inside the canvas

      function clamp(n: number, lo: number, hi: number) {
        return Math.max(lo, Math.min(hi, n));
      }
      function maxScroll(): number {
        return Math.max(0, contentHeight - app.screen.height);
      }

      function layoutScrollbar() {
        // track fits the viewport height
        const trackH = Math.max(0, app.screen.height - SB_PAD * 2);
        const trackX = app.screen.width - SB_W - SB_PAD;
        const trackY = SB_PAD;

        // draw track
        track
          .clear()
          .roundRect(trackX, trackY, SB_W, trackH, SB_W / 2)
          .fill(0x000000);

        // thumb size based on viewport/content ratio
        const ratio = clamp(app.screen.height / contentHeight, 0, 1);
        const minThumb = 24;
        const thumbH = Math.max(minThumb, trackH * ratio);

        // place thumb based on current scroll
        const t = maxScroll() ? scrollY / maxScroll() : 0;
        const thumbY = trackY + t * (trackH - thumbH);

        thumb
          .clear()
          .roundRect(trackX, thumbY, SB_W, thumbH, SB_W / 2)
          .fill(0x666666);

        // hide scrollbar if not needed
        const need = maxScroll() > 0;
        track.visible = thumb.visible = need;
      }

      function applyScroll() {
        scrollY = clamp(scrollY, 0, maxScroll());
        world.y = -Math.round(scrollY);
        layoutScrollbar();
      }

      // Wheel to scroll
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        scrollY += e.deltaY * wheelSpeed;
        applyScroll();
      };
      host.addEventListener("wheel", onWheel, { passive: false });

      // Drag the thumb
      let dragging = false;
      let dragOffset = 0;

      const getLocalY = (clientY: number) => {
        const rect = host.getBoundingClientRect();
        return clientY - rect.top; // stage Y in CSS pixels
      };

      thumb.on("pointerdown", (e) => {
        dragging = true;
        thumb.cursor = "grabbing";
        const localY = getLocalY((e as any).clientY ?? e.data.global.y);
        dragOffset = localY - thumb.y;
        const move = (ev: PointerEvent) => {
          if (!dragging) return;
          const trackH = Math.max(0, app.screen.height - SB_PAD * 2);
          const trackY = SB_PAD;
          const thumbH = thumb.height;
          const local = getLocalY(ev.clientY);
          const newThumbY = clamp(local - dragOffset, trackY, trackY + trackH - thumbH);
          // convert thumb position -> scrollY
          const t = (newThumbY - trackY) / Math.max(1, trackH - thumbH);
          scrollY = t * maxScroll();
          applyScroll();
        };
        const up = () => {
          dragging = false;
          thumb.cursor = "grab";
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up, { once: true });
      });

      // Keep scrollbar in the right place on resize
      const onResize = () => applyScroll();
      (app.renderer as any).on?.("resize", onResize);

      // initial layout
      applyScroll();
    })();

    return () => {
      // Mark unmounted to prevent late code from touching the old app
      const app = appRef.current;
      appRef.current = null;

      // Only destroy if init finished (renderer exists)
      if (app && initedRef.current && (app as any).renderer) {
        try {
          app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
        } catch {
          // swallow – double-destroy-safe
        }
      }
    };
  }, []);

  // Important: host must have space in your layout (w-full h-full, min-h-0 on flex parents)
  return <div ref={hostRef} className="w-full h-full" />;
}
