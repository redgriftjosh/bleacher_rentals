"use client";
import { Application } from "pixi.js";
import { useEffect, useRef } from "react";

export default function SimpleStage() {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    (async () => {
      const host = hostRef.current;
      if (!host) return;
      const app = new Application();
      await app.init({
        resizeTo: host,
        // preference: "webgpu",
        // powerPreference: "high-performance",
        backgroundColor: 0x0e0e10,
      });
      host.appendChild(app.canvas);
    })();
  }, []);
  return <div ref={hostRef} className="relative w-full h-full"></div>;
}
