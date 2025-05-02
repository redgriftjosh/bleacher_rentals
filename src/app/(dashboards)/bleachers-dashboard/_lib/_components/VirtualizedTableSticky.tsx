import React, { useMemo, useRef } from "react";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import type { Range } from "@tanstack/react-virtual";
import { DateTime } from "luxon";
import { VirtualizedRow } from "./VirtualizedRow";

export const VirtualizedTableSticky = () => {
  const parentRef = useRef<HTMLDivElement>(null);

  const startDate = useMemo(() => DateTime.now().minus({ years: 2 }).startOf("day"), []);
  const totalDays = 365 * 4;

  const rows = 10000;
  const columns = totalDays;
  const cellWidth = 120;
  const cellHeight = 50;

  // Generate array of dates once
  const dates = useMemo(
    () =>
      Array.from({ length: totalDays }, (_, i) =>
        startDate.plus({ days: i }).toFormat("MMM d, yyyy")
      ),
    [startDate]
  );

  const stickyHeaderRangeExtractor = (range: Range) => {
    const indexes = new Set([
      0, // Always keep the header row rendered
      ...defaultRangeExtractor(range),
    ]);
    return [...indexes].sort((a, b) => a - b);
  };

  const rowVirtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => parentRef.current,
    rangeExtractor: stickyHeaderRangeExtractor,
    estimateSize: () => cellHeight,
    overscan: 5,
  });

  return (
    <>
      <div ref={parentRef} className="h-[400px] w-full overflow-auto border">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: `${cellWidth * columns}px`,
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => (
            <VirtualizedRow
              key={virtualRow.key}
              virtualRow={virtualRow}
              columns={columns}
              cellWidth={cellWidth}
              dates={dates}
              parentRef={parentRef}
              isHeaderRow={virtualRow.index === 0}
            />
          ))}
        </div>
      </div>
    </>
  );
};
