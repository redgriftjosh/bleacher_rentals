"use client";

import { Application } from "pixi.js";
import { useEffect, useRef } from "react";
import { main } from "./main";
import { Bleacher } from "./db/client/bleachers";
import { Baker } from "./util/Baker";
import { EventSpanBody } from "./ui/EventSpanBody";

export default function DashboardApp({ bleachers }: { bleachers: Bleacher[] }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const initedRef = useRef(false);
  const isFirstRenderRef = useRef(true);

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

      // Clear the stage properly before adding new content (only on subsequent renders)
      if (!isFirstRenderRef.current) {
        try {
          // Stop the ticker temporarily to prevent rendering during cleanup
          app.ticker.stop();

          // Destroy all Baker instances to clear texture caches
          Baker.destroyAllInstances();

          // Clear static textures from EventSpanBody
          EventSpanBody.clearStaticTextures();

          // Remove all children and destroy them
          while (app.stage.children.length > 0) {
            const child = app.stage.children[0];
            app.stage.removeChild(child);
            if (child && typeof child.destroy === "function") {
              child.destroy({ children: true });
            }
          }

          // Force a render to clear any pending operations
          app.renderer.render(app.stage);

          // Restart the ticker
          app.ticker.start();
        } catch (error) {
          console.warn("Error clearing PIXI stage:", error);
        }
      }

      // Small delay to ensure cleanup is complete before recreating (only on subsequent renders)
      if (!isFirstRenderRef.current) {
        // setTimeout(() => {
        //   if (!destroyed && appRef.current === app) {
        //     main(app, bleachers);
        //     initedRef.current = true;
        //   }
        // }, 10);
        if (!destroyed && appRef.current === app) {
          main(app, bleachers);
          initedRef.current = true;
        }
      } else {
        // First render - no delay needed
        main(app, bleachers);
        initedRef.current = true;
      }

      isFirstRenderRef.current = false;
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
  }, [bleachers]);

  return (
    // add padding to parent div
    <div className="w-full h-[calc(100%-57px)] pl-2">
      <div ref={hostRef} className="w-full h-full border-l border-t border-gray-300" />
    </div>
  );
}
