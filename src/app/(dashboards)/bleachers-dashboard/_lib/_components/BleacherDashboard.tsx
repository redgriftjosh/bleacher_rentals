"use client";
import { useEffect, useRef, useState } from "react";

const NUM_ITEMS = 37290000;
const ITEM_HEIGHT = 40;
const WINDOW_HEIGHT = 500;

export default function BleacherDashboard() {
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const update = () => {
      setDimensions({
        width: window.innerWidth - 340,
        height: window.innerHeight - 239,
      });
    };
    update(); // Set on mount
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Virtualized Grid</h1>
      <VirtualizedGrid
        rowCount={100000}
        columnCount={100000}
        rowHeight={40}
        columnWidth={120}
        windowHeight={dimensions.height}
        windowWidth={dimensions.width}
        renderCell={({ rowIndex, columnIndex, style }) => (
          <div
            key={`${rowIndex}-${columnIndex}`}
            style={style}
            className="border text-sm text-center bg-white"
          >
            R{rowIndex + 1}, C{columnIndex + 1}
          </div>
        )}
      />
    </div>
  );
}

interface VirtualizedListProps {
  numItems: number;
  itemHeight: number;
  windowHeight: number;
  renderItem: (props: { index: number; style: React.CSSProperties }) => React.ReactNode;
}

const VirtualizedList: React.FC<VirtualizedListProps> = ({
  numItems,
  itemHeight,
  renderItem,
  windowHeight,
}) => {
  const [scrollTop, setScrollTop] = useState(0);

  const innerHeight = numItems * itemHeight;
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(numItems - 1, Math.floor((scrollTop + windowHeight) / itemHeight));

  const items: React.ReactNode[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    items.push(
      renderItem({
        index: i,
        style: {
          position: "absolute",
          top: `${i * itemHeight}px`,
          width: "100%",
        },
      })
    );
  }

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return (
    <div
      className="scroll"
      style={{ overflowY: "scroll", height: `${windowHeight}px` }}
      onScroll={onScroll}
    >
      <div className="inner" style={{ position: "relative", height: `${innerHeight}px` }}>
        {items}
      </div>
    </div>
  );
};

interface VirtualizedGridProps {
  rowCount: number;
  columnCount: number;
  rowHeight: number;
  columnWidth: number;
  windowHeight: number;
  windowWidth: number;
  renderCell: (props: {
    rowIndex: number;
    columnIndex: number;
    style: React.CSSProperties;
  }) => React.ReactNode;
}

const VirtualizedGrid: React.FC<VirtualizedGridProps> = ({
  rowCount,
  columnCount,
  rowHeight,
  columnWidth,
  windowHeight,
  windowWidth,
  renderCell,
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalHeight = rowCount * rowHeight;
  const totalWidth = columnCount * columnWidth;

  const startRow = Math.floor(scrollTop / rowHeight);
  const endRow = Math.min(rowCount - 1, Math.floor((scrollTop + windowHeight) / rowHeight));

  const startCol = Math.floor(scrollLeft / columnWidth);
  const endCol = Math.min(columnCount - 1, Math.floor((scrollLeft + windowWidth) / columnWidth));

  const cells: React.ReactNode[] = [];
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      cells.push(
        renderCell({
          rowIndex: row,
          columnIndex: col,
          style: {
            position: "absolute",
            top: row * rowHeight,
            left: col * columnWidth,
            width: columnWidth,
            height: rowHeight,
          },
        })
      );
    }
  }

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
    setScrollLeft(e.currentTarget.scrollLeft);
  };

  return (
    <div
      ref={containerRef}
      style={{
        overflow: "scroll",
        height: windowHeight,
        width: windowWidth,
        position: "relative",
      }}
      onScroll={onScroll}
    >
      <div
        style={{
          position: "relative",
          height: totalHeight,
          width: totalWidth,
        }}
      >
        {cells}
      </div>
    </div>
  );
};
