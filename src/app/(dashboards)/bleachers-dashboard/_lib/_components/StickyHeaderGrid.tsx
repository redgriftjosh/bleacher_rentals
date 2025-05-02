import React from "react";

const rows = 50;
const columns = 1000;

const generateData = () =>
  Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, col) => `R${row + 1}C${col + 1}`)
  );

// this table is showing how to make header and row sticky

export const StickyHeaderGrid = () => {
  const data = generateData();

  return (
    <div className="h-[400px] w-full overflow-auto border">
      <div style={{ width: `${columns * 120}px` }}>
        {/* Header row */}
        <div className="flex sticky top-0 z-30 bg-gray-100">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className={`w-[120px] h-[50px] border p-2 text-sm font-medium ${
                colIndex === 0 ? "sticky left-0 z-30 bg-gray-200" : ""
              }`}
            >
              Header {colIndex + 1}
            </div>
          ))}
        </div>

        {/* Body rows */}
        {data.map((row, rowIndex) => (
          <div key={rowIndex} className="flex">
            {row.map((cell, colIndex) => (
              <div
                key={colIndex}
                className={`${
                  colIndex === 0
                    ? "sticky left-0 z-[20] w-[120px] h-[50px] border p-2 text-sm bg-gray-50"
                    : "w-[120px] h-[50px] border p-2 text-sm bg-white"
                }`}
              >
                {cell}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
