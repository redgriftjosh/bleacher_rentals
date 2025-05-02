import React from "react";

const rows = 30;
const columns = 20;

const generateData = () =>
  Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, col) => `R${row + 1}C${col + 1}`)
  );

export const StickyGridTable = () => {
  const data = generateData();

  return (
    <div
      className="relative h-[500px] w-full overflow-auto border"
      style={{ position: "relative" }}
    >
      <div
        className="relative"
        style={{
          width: `${columns * 120}px`,
          height: `${rows * 50}px`,
        }}
      >
        {data.map((row, rowIndex) => (
          <div key={rowIndex} className="flex">
            {row.map((cell, colIndex) => {
              const isHeader = rowIndex === 0;
              const isStickyColumn = colIndex === 0;

              return (
                <div
                  key={colIndex}
                  className={`p-2 w-[120px] h-[50px] border box-border text-sm
    ${isHeader ? "sticky top-0 z-[30] bg-gray-100" : "bg-white"}
    ${isStickyColumn ? "sticky left-0 z-[20] bg-gray-50" : ""}
    ${isHeader && isStickyColumn ? "z-[40] bg-gray-200" : ""}
  `}
                >
                  {cell}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
