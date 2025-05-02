import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import type { VirtualItem } from "@tanstack/react-virtual";
import React from "react";

export const VirtualizedRow = ({
  virtualRow,
  columns,
  cellWidth,
  dates,
  parentRef,
  isHeaderRow,
}: {
  virtualRow: VirtualItem;
  columns: number;
  cellWidth: number;
  dates: string[];
  parentRef: React.RefObject<HTMLDivElement | null>;
  isHeaderRow: boolean;
}) => {
  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: columns,
    getScrollElement: () => parentRef.current,
    rangeExtractor: (range) =>
      [0, ...defaultRangeExtractor(range)]
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .sort((a, b) => a - b),
    estimateSize: () => cellWidth,
    overscan: 5,
  });

  return isHeaderRow ? (
    <div className="sticky top-0 z-30 bg-gray-100" key={virtualRow.key + "row"}>
      {columnVirtualizer.getVirtualItems().map((virtualColumn) => (
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
            backgroundColor: virtualColumn.index === 0 ? "#e5e7eb" : "#f8f8f8",
          }}
        >
          {dates[virtualColumn.index]}
        </div>
      ))}
    </div>
  ) : (
    <React.Fragment key={virtualRow.key}>
      {columnVirtualizer.getVirtualItems().map((virtualColumn) => {
        const cellContent = dates[virtualColumn.index];

        if (virtualColumn.index === 0) {
          return (
            <div
              key={`${virtualRow.index}-${virtualColumn.index}`}
              className="border p-2 text-sm bg-gray-100"
              style={{
                position: "sticky",
                left: 0,
                // top: `${virtualRow.start}px`,
                zIndex: 20,
                width: `${virtualColumn.size}px`,
                height: `${virtualRow.size}px`,
              }}
            >
              {virtualRow.index === 0
                ? "👀 First Row Visible"
                : `Row ${virtualRow.index}, sees Row 0`}
            </div>
          );
        }

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
      })}
    </React.Fragment>
  );
};
