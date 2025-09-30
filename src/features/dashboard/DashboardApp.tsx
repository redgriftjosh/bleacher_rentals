"use client";

import { Application } from "pixi.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { main } from "./main";
import { Bleacher } from "./db/client/bleachers";
import { Baker } from "./util/Baker";
import { EventSpanBody } from "./ui/EventSpanBody";
import { HorizontalScrollbar } from "./ui/HorizontalScroll";
import { VerticalScrollbar } from "./ui/VerticalScroll";
import { useCurrentEventStore } from "@/app/(dashboards)/bleachers-dashboard/_lib/useCurrentEventStore";
import CellEditor from "./components/CellEditor";
import WorkTrackerModal from "@/app/(dashboards)/bleachers-dashboard/_lib/_components/dashboard/WorkTrackerModal";
import { Tables } from "../../../database.types";

export default function DashboardApp({ bleachers }: { bleachers: Bleacher[] }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const initedRef = useRef(false);
  const isFirstRenderRef = useRef(true);

  const runtimeRef = useRef<{ hscroll: HorizontalScrollbar; vscroll: VerticalScrollbar } | null>(
    null
  );
  const lastContentXRef = useRef<number | null>(null);
  const lastContentYRef = useRef<number | null>(null);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [resizeTrigger, setResizeTrigger] = useState(false);

  // State for work tracker modal
  const [selectedWorkTracker, setSelectedWorkTracker] = useState<Tables<"WorkTrackers"> | null>(
    null
  );

  const isFormExpanded = useCurrentEventStore((s) => s.isFormExpanded);

  const handleResize = useCallback(() => {
    // Cancel any pending flip
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    // Schedule a new flip exactly 1000ms after the *last* call
    resizeTimeoutRef.current = setTimeout(() => {
      // functional update avoids stale closure on `resizeTrigger`
      setResizeTrigger((v) => !v);
      resizeTimeoutRef.current = null;
    }, 1000);
  }, []);

  useEffect(() => {
    console.log("isFormExpanded");
    handleResize();
  }, [isFormExpanded, handleResize]);

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
          console.log("not first render, lastContentXRef.current:", lastContentXRef.current);
          const runtime = main(app, bleachers, lastContentXRef.current, lastContentYRef.current);
          runtimeRef.current = runtime;
          initedRef.current = true;
        }
      } else {
        // First render - no delay needed
        console.log("First render lastContentXRef.current:", lastContentXRef.current);
        const runtime = main(app, bleachers, lastContentXRef.current, lastContentYRef.current);
        initedRef.current = true;
        runtimeRef.current = runtime;
      }

      isFirstRenderRef.current = false;
    })();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      // ⬅️ capture latest scroll BEFORE destroying Pixi
      const current = runtimeRef.current?.hscroll?.getContentX?.();
      const currentY = runtimeRef.current?.vscroll?.getContentY?.();
      console.log("current", current);
      if (typeof current === "number") {
        lastContentXRef.current = current;
      }
      if (typeof currentY === "number") {
        lastContentYRef.current = currentY;
      }
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
  }, [bleachers, resizeTrigger, handleResize]);

  const handleWorkTrackerOpen = (workTracker: Tables<"WorkTrackers">) => {
    setSelectedWorkTracker(workTracker);
  };

  // return (
  //   // add padding to parent div
  //   // [calc(100%-57px)]
  //   <div className="w-full h-full pl-2">
  //     <div ref={hostRef} className="w-full h-full border-l border-t border-gray-300" />
  //   </div>
  // );
  return (
    <div className="w-full h-full pl-2 relative">
      <div ref={hostRef} className="w-full h-full border-l border-t border-gray-300" />

      {/* Modal components */}
      <CellEditor onWorkTrackerOpen={handleWorkTrackerOpen} />
      <WorkTrackerModal
        selectedWorkTracker={selectedWorkTracker}
        setSelectedWorkTracker={setSelectedWorkTracker}
        setSelectedBlock={() => {}} // Not used in PixiJS version
      />
    </div>
  );
}
