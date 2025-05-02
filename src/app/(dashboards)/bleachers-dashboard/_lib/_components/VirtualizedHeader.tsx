import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import type { Range } from "@tanstack/react-virtual";
import React from "react";

export const VirtualizedHeader = (
  dates: string[],
  columns: number,
  parentRef: any,
  rowIndex: number
) => {
  const stickyColumnRangeExtractor = (range: Range) => {
    const indexes = new Set([
      0, // Always render first column
      ...defaultRangeExtractor(range),
    ]);
    return [...indexes].sort((a, b) => a - b);
  };

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: columns,
    getScrollElement: () => parentRef.current,
    rangeExtractor: stickyColumnRangeExtractor,
    estimateSize: () => 120,
    overscan: 5,
  });
  return (
    <div className="sticky top-0 z-30 bg-gray-100" key={rowIndex}>
      <React.Fragment>
        {columnVirtualizer.getVirtualItems().map((virtualColumn) => {
          return (
            <div
              key={virtualColumn.key + "header"}
              className={`border p-2 text-sm font-medium bg-gray-100 ${
                virtualColumn.index === 0 ? "z-40" : "z-30"
              }`}
              style={{
                position: virtualColumn.index === 0 ? "sticky" : "absolute",
                top: 0,
                left: virtualColumn.index === 0 ? 0 : undefined,
                transform:
                  virtualColumn.index === 0 ? undefined : `translateX(${virtualColumn.start}px)`,
                width: `${virtualColumn.size}px`,
                height: `50px`,
                backgroundColor: virtualColumn.index === 0 ? "#e5e7eb" : "#f8f8f8", // optional: gray
              }}
            >
              {dates[virtualColumn.index]}
            </div>
          );
        })}
      </React.Fragment>
    </div>
  );
};
