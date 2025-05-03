import React, { useMemo, useRef } from "react";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import type { Range } from "@tanstack/react-virtual";
import { DateTime } from "luxon";

export const VirtualizedStickerColumn = () => {
  const parentRef = useRef<HTMLDivElement>(null);

  const startDate = useMemo(() => DateTime.now().minus({ years: 2 }).startOf("day"), []);
  const totalDays = 365 * 4;
  const rows = 10000;
  const columns = totalDays;

  const dates = useMemo(
    () =>
      Array.from({ length: totalDays }, (_, i) =>
        startDate.plus({ days: i }).toFormat("MMM d, yyyy")
      ),
    [startDate]
  );

  const rowVirtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => parentRef.current,
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
    <div ref={parentRef} className="h-[400px] w-full overflow-auto border">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: `${columnVirtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {columnVirtualizer.getVirtualItems().map((virtualColumn) => {
          return rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const isFirstCol = virtualColumn.index === 0;
            const isHeaderRow = virtualRow.index === 0;
            const content = isFirstCol
              ? isHeaderRow
                ? "👀 First Cell"
                : `Row ${virtualRow.index}, sees Col 0`
              : dates[virtualColumn.index];

            const commonStyles = {
              width: `${virtualColumn.size}px`,
              height: `${virtualRow.size}px`,
            };

            const stickyStyles = isFirstCol
              ? {
                  position: "sticky" as const,
                  left: 0,
                  zIndex: 10,
                  background: "#f3f4f6",
                  transform: `translateY(${virtualRow.start}px)`,
                  top: 0,
                }
              : {
                  position: "absolute" as const,
                  transform: `translateX(${virtualColumn.start}px) translateY(${virtualRow.start}px)`,
                };

            return (
              <div
                key={`${virtualRow.index}-${virtualColumn.index}`}
                className="border p-2 text-sm"
                style={{ ...commonStyles, ...stickyStyles }}
              >
                {content}
              </div>
            );
          });
        })}
      </div>
    </div>
  );
};
