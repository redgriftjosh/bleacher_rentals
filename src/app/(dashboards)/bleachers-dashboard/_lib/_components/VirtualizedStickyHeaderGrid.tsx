import React, { useMemo, useRef } from "react";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import type { Range } from "@tanstack/react-virtual";
import { DateTime } from "luxon";

export const VirtualizedStickyHeaderGrid = () => {
  const parentRef = React.useRef(null);

  const startDate = useMemo(() => DateTime.now().minus({ years: 2 }).startOf("day"), []);
  const totalDays = 365 * 4;

  const rows = 10000;
  const columns = totalDays;

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
    estimateSize: () => 50,
    overscan: 5,
  });

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
    <>
      <div ref={parentRef} className="h-[400px] w-full overflow-auto border">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: `${columnVirtualizer.getTotalSize()}px`,
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const isHeaderRow = virtualRow.index === 0;

            if (isHeaderRow) {
              return (
                <div className="sticky top-0 z-30 bg-gray-100" key={virtualRow.key + "row"}>
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
                              virtualColumn.index === 0
                                ? undefined
                                : `translateX(${virtualColumn.start}px)`,
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
            } else {
              return (
                <React.Fragment key={virtualRow.key}>
                  {columnVirtualizer.getVirtualItems().map((virtualColumn) => {
                    {
                      console.log(
                        "Visible rows:",
                        rowVirtualizer.getVirtualItems().map((r) => r.index)
                      );
                    }
                    const cellContent = dates[virtualColumn.index];
                    if (virtualColumn.index === 0) {
                      return (
                        <div
                          key={`${virtualRow.index}-${virtualColumn.index}`}
                          className="border p-2 text-sm bg-gray-100"
                          style={{
                            position: "sticky",
                            left: 0,
                            zIndex: 20,
                            width: `${virtualColumn.size}px`,
                            height: `${virtualRow.size}px`,
                            // top: `${virtualRow.start + 1}px`,
                            // transform: `translateY(${virtualRow.start}px)`,
                          }}
                        >
                          {virtualRow.index === 0
                            ? "👀 First Row Visible"
                            : `Row ${virtualRow.index}, sees Row 0`}
                        </div>
                      );
                    } else {
                      return (
                        <div
                          key={`${virtualRow.index}-${virtualColumn.index}`}
                          className="border p-2 text-sm bg-white"
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: `${virtualColumn.size}px`,
                            height: `${virtualRow.size}px`,
                            transform: `translateX(${virtualColumn.start}px) translateY(${virtualRow.start}px)`,
                          }}
                        >
                          {cellContent}
                        </div>
                      );
                    }
                  })}
                </React.Fragment>
              );
            }
          })}
        </div>
      </div>
    </>
  );
};
