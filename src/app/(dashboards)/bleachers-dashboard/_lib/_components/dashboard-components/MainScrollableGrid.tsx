import clsx from "clsx";
import { Grid, ScrollParams } from "react-virtualized";

type MainScrollableGridProps = {
  ROW_HEIGHT: number;
  width: number;
  COLUMN_WIDTH: number;
  COLUMN_COUNT: number;
  height: number;
  ROW_COUNT: number;
  onScroll: (params: ScrollParams) => void;
  DATE_RANGE: number;
};

export default function MainScrollableGrid({
  ROW_HEIGHT,
  width,
  COLUMN_WIDTH,
  COLUMN_COUNT,
  height,
  ROW_COUNT,
  onScroll,
  DATE_RANGE,
}: MainScrollableGridProps) {
  return (
    <div
      style={{
        // backgroundColor: `rgb(${midBg.r},${midBg.g},${midBg.b})`,
        height,
        width,
      }}
    >
      <Grid
        scrollToColumn={DATE_RANGE + 4}
        onScroll={onScroll}
        columnWidth={COLUMN_WIDTH}
        columnCount={COLUMN_COUNT}
        height={height}
        rowHeight={ROW_HEIGHT}
        rowCount={ROW_COUNT}
        width={width}
        cellRenderer={({ rowIndex, columnIndex, key, style }) => (
          <div
            key={key}
            style={style}
            className={clsx(
              "flex justify-center items-center text-sm w-full h-full",
              (rowIndex + columnIndex) % 2 === 0 ? "bg-white" : "bg-gray-100"
            )}
          >
            R{rowIndex}, C{columnIndex}
          </div>
        )}
      />
    </div>
  );
}
