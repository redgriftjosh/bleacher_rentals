"use client";

import { Application } from "pixi.js";
import { useEffect, useRef } from "react";
import { main } from "./main";
import { Bleacher } from "./db/client/bleachers";

export default function DashboardApp({ bleachers }: { bleachers: Bleacher[] }) {
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
        antialias: false,
        powerPreference: "high-performance",
      });

      if (destroyed || appRef.current !== app) return;

      host.appendChild(app.canvas);
      main(app, bleachers);
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

  return (
    // add padding to parent div
    <div className="w-full h-full pt-2 pl-2 ">
      <div ref={hostRef} className="w-full h-full border-l border-t border-gray-300" />
    </div>
  );
}
