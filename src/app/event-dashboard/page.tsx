"use client";

import { Color } from "@/types/Color";

export default function EventDashboardPage() {
  return (
    <div className="w-[4000px] h-[150px] relative">
      <div
        className="w-[500px] h-[100px] absolute rounded-md"
        style={{ backgroundColor: Color.LIGHT_BLUE, left: "200px" }}
      >
        <div
          className=" rounded absolute inset-0"
          style={{ backgroundColor: "hsl(54, 80%, 50%)" }}
        ></div>
        <div
          className="sticky left-0 top-0 bg-transparent text-white  z-10"
          style={{ width: "fit-content" }}
        >
          I'm sticky horiz
        </div>
      </div>
    </div>
  );
}
