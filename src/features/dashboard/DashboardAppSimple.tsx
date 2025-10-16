"use client";

import { Application } from "pixi.js";
import { useEffect, useRef } from "react";
import { main } from "./main";

type Props = {
  onWorkTrackerSelect?: (workTracker: {
    work_tracker_id: number;
    bleacher_id: number;
    date: string;
  }) => void;
};

export default function DashboardAppSimple({ onWorkTrackerSelect }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const dashboardRef = useRef<any>(null);

  useEffect(() => {
    const app = new Application();
    appRef.current = app;
    let destroyed = false;

    (async () => {
      const host = hostRef.current!;
      await app.init({
        resizeTo: host,
        background: "#ffffff",
        resolution: window.devicePixelRatio,
        autoDensity: true,
        antialias: false,
        powerPreference: "high-performance",
        roundPixels: false,
      });
      if (destroyed || appRef.current !== app) return;
      host.appendChild(app.canvas);
      try {
        const dashboard = main(app, { onWorkTrackerSelect });
        dashboardRef.current = dashboard;
      } catch (error) {
        console.error("Error initializing PIXI main:", error);
      }
    })();

    return () => {
      destroyed = true;
      if (dashboardRef.current) {
        try {
          dashboardRef.current.destroy?.();
        } catch {}
        dashboardRef.current = null;
      }
      const app = appRef.current;
      appRef.current = null;
      if (app) {
        try {
          app.ticker.stop();
          if (app.renderer && (app.renderer as any).texture && (app.renderer as any).texture.gc) {
            (app.renderer as any).texture.gc();
          }
          app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
        } catch (error) {
          try {
            app.destroy();
          } catch {}
        }
      }
    };
  }, [onWorkTrackerSelect]);

  return (
    <div className="w-full h-full pl-2 relative">
      <div ref={hostRef} className="w-full h-full border-l border-t border-gray-300" />
    </div>
  );
}
