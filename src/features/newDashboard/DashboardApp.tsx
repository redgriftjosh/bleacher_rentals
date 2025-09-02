"use client";

import { Application } from "pixi.js";
import { useEffect, useRef } from "react";
import { dashboard } from "./pixi/dashboard";

export default function DashboardApp() {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const initedRef = useRef(false);

  useEffect(() => {
    const app = new Application();
    appRef.current = app;

    let destroyed = false;

    (async () => {
      const host = hostRef.current!;
      await app.init({
        resizeTo: host,
        background: "#ffffff",
        resolution: Math.min(2, window.devicePixelRatio || 1),
        autoDensity: true,
        antialias: false, // hairline grid uses 0.5 trick; keep this off
      });

      if (destroyed || appRef.current !== app) return;

      host.appendChild(app.canvas);
      dashboard(app);
      initedRef.current = true;
    })();

    return () => {
      destroyed = true;
      const app = appRef.current;
      appRef.current = null;

      if (app && initedRef.current && (app as any).renderer) {
        try {
          app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
        } catch {
          // swallow – double-destroy-safe
        }
      }
    };
  }, []);

  return <div ref={hostRef} className="w-full h-full" />;
}
