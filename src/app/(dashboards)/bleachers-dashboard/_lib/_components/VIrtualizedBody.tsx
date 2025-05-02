import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import type { Range } from "@tanstack/react-virtual";
import React from "react";

export const VirtualizedBody = (
  dates: string[],
  columns: number,
  parentRef: any,
  rowIndex: number,
  cellWidth: number
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
    <React.Fragment key={rowIndex}>
      {columnVirtualizer.getVirtualItems().map((virtualColumn) => {
        const cellContent = dates[virtualColumn.index];
        if (virtualColumn.index === 0) {
          return (
            <div
              key={`${rowIndex}-${virtualColumn.index}`}
              className="border p-2 text-sm bg-gray-100"
              style={{
                position: "sticky",
                left: 0,
                zIndex: 20,
                width: `${virtualColumn.size}px`,
                height: `${cellWidth * columns}px`,
                // top: `${virtualRow.start + 1}px`,
                // transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {rowIndex === 0 ? "👀 First Row Visible" : `Row ${rowIndex}, sees Row 0`}
            </div>
          );
        } else {
          return (
            <div
              key={`${rowIndex}-${virtualColumn.index}`}
              className="border p-2 text-sm bg-white"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${virtualColumn.size}px`,
                height: `${cellWidth * columns}px`,
                transform: `translateX(${virtualColumn.start}px) translateY(0px)`,
              }}
            >
              {cellContent}
            </div>
          );
        }
      })}
    </React.Fragment>
  );
};
