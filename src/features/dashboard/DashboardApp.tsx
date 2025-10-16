"use client";

import { Application } from "pixi.js";
import { useEffect, useRef } from "react";
import { main } from "./main";
import { useFilterDashboardStore } from "../dashboardOptions/useFilterDashboardStore";

type Props = {
  summerAssignedBleacherIds?: number[];
  winterAssignedBleacherIds?: number[];
};

export default function DashboardApp({
  summerAssignedBleacherIds = [],
  winterAssignedBleacherIds = [],
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const dashboardRef = useRef<any>(null);
  // No callback plumbing; click handling writes to a zustand store from inside Pixi

  // Store assignment IDs into filter store for downstream filtering logic
  useEffect(() => {
    useFilterDashboardStore
      .getState()
      .setField("summerAssignedBleacherIds", summerAssignedBleacherIds);
    useFilterDashboardStore
      .getState()
      .setField("winterAssignedBleacherIds", winterAssignedBleacherIds);
  }, [summerAssignedBleacherIds, winterAssignedBleacherIds]);

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
        const dashboard = main(app, {});
        dashboardRef.current = dashboard;
      } catch (error) {
        console.error("Error initializing PIXI main:", error);
      }
    })();

    return () => {
      destroyed = true;
      if (dashboardRef.current) {
        try {
          if (typeof dashboardRef.current.destroy === "function") {
            dashboardRef.current.destroy();
          }
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
          console.warn("Error during PIXI cleanup:", error);
          try {
            app.destroy();
          } catch {}
        }
      }
    };
  }, []);

  return (
    <div className="w-full h-full pl-2 relative">
      <div ref={hostRef} className="w-full h-full border-l border-t border-gray-300" />
    </div>
  );
}
