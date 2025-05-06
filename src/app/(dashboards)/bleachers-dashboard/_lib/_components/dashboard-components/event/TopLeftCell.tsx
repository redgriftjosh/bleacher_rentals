import { Grid } from "react-virtualized";
import { useEffect, useRef } from "react";
import { useCurrentEventStore } from "../../../useCurrentEventStore";

type TopLeftCellProps = {
  ROW_HEIGHT: number;
  STICKY_LEFT_COLUMN_WIDTH: number;
  STICKY_LEFT_COLUMN_WIDTH_EXPANDED: number;
};

export default function TopLeftCell({
  ROW_HEIGHT,
  STICKY_LEFT_COLUMN_WIDTH,
  STICKY_LEFT_COLUMN_WIDTH_EXPANDED,
}: TopLeftCellProps) {
  const isFormExpanded = useCurrentEventStore((s) => s.isFormExpanded);
  const gridRef = useRef<Grid>(null);

  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.recomputeGridSize();
      gridRef.current.forceUpdate(); // optional, but helps ensure render
    }
  }, [isFormExpanded]);
  return (
    <div
      className="absolute z-20 border-r border-b bg-gray-50 transition-all duration-1000 ease-in-out"
      style={{
        width: isFormExpanded ? STICKY_LEFT_COLUMN_WIDTH_EXPANDED : STICKY_LEFT_COLUMN_WIDTH,
        height: ROW_HEIGHT,
        // backgroundColor: `rgb(${topBg.r},${topBg.g},${topBg.b})`,
      }}
    >
      <Grid
        ref={gridRef}
        cellRenderer={({ key, style }) => (
          <div
            key={key}
            style={style}
            className="px-4 py-2 text-left text-md font-bold w-full h-full"
          >
            Event
          </div>
        )}
        width={isFormExpanded ? STICKY_LEFT_COLUMN_WIDTH_EXPANDED : STICKY_LEFT_COLUMN_WIDTH}
        height={ROW_HEIGHT}
        rowHeight={ROW_HEIGHT}
        columnWidth={isFormExpanded ? STICKY_LEFT_COLUMN_WIDTH_EXPANDED : STICKY_LEFT_COLUMN_WIDTH}
        rowCount={1}
        columnCount={1}
      />
    </div>
  );
}
