"use client";

import { useState } from "react";
import TimeRangeToggle from "./TimeRangeToggle";

export function ScorecardHeader() {
  const [isRangeAnimating, setIsRangeAnimating] = useState(false);

  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <div className="text-5xl text-darkBlue font-bold">Overview</div>
        <div className="text-2xl text-gray-500 font-medium">Team Data</div>
      </div>
      <TimeRangeToggle />
    </div>
  );
}
