"use client";
import { memo, useEffect, useState } from "react";
import { AutoSizer, Grid, ScrollSync } from "react-virtualized";
import scrollbarSize from "dom-helpers/scrollbarSize";
import clsx from "clsx";
import "react-virtualized/styles.css";
import { DateTime } from "luxon";
import StickyTopRow from "./dashboard-components/StickyTopRow";
import MainScrollableGrid from "./dashboard-components/MainScrollableGrid";
import StickyLeftColumn from "./dashboard-components/StickyLeftColumn";
import TopLeftCell from "./dashboard-components/TopLeftCell";
import { fetchBleachers } from "../db";

const COLUMN_WIDTH = 100;
const STICKY_LEFT_COLUMN_WIDTH = 145;
const STICKY_LEFT_COLUMN_WIDTH_EXPANDED = STICKY_LEFT_COLUMN_WIDTH + 40;
const DATE_RANGE = 1000;
const HEADER_ROW_HEIGHT = 40;
const ROW_HEIGHT = 60;

const LEFT_COLOR_FROM = { r: 71, g: 16, b: 97 };
const LEFT_COLOR_TO = { r: 188, g: 57, b: 89 };
const TOP_COLOR_FROM = { r: 0, g: 0, b: 0 };
const TOP_COLOR_TO = { r: 51, g: 51, b: 51 };

function mixColors(c1: any, c2: any, amount: number) {
  return {
    r: Math.round(amount * c1.r + (1 - amount) * c2.r),
    g: Math.round(amount * c1.g + (1 - amount) * c2.g),
    b: Math.round(amount * c1.b + (1 - amount) * c2.b),
  };
}

const BleacherDashboard = memo(() => {
  const [height, setHeight] = useState(400);

  const dates: string[] = Array.from({ length: DATE_RANGE * 2 + 1 }, (_, i) =>
    DateTime.now()
      .plus({ days: i - DATE_RANGE })
      .toISODate()
  );
  const bleachers = fetchBleachers();
  const ROW_COUNT = bleachers.length;

  const COLUMN_COUNT = dates.length;

  useEffect(() => {
    setHeight(window.innerHeight - 205);
    // 779 - 205
    console.log("window.innerHeight", window.innerHeight);
  }, []);

  return (
    <ScrollSync>
      {({
        clientHeight,
        clientWidth,
        scrollHeight,
        scrollLeft,
        scrollTop,
        scrollWidth,
        onScroll,
      }) => {
        const x = scrollLeft / (scrollWidth - clientWidth);
        const y = scrollTop / (scrollHeight - clientHeight);

        const leftBg = mixColors(LEFT_COLOR_FROM, LEFT_COLOR_TO, y);
        const topBg = mixColors(TOP_COLOR_FROM, TOP_COLOR_TO, x);
        const midBg = mixColors(leftBg, topBg, 0.5);

        return (
          <div className="relative flex border ">
            {/* Top-left cell */}
            <TopLeftCell
              ROW_HEIGHT={HEADER_ROW_HEIGHT}
              STICKY_LEFT_COLUMN_WIDTH={STICKY_LEFT_COLUMN_WIDTH}
              STICKY_LEFT_COLUMN_WIDTH_EXPANDED={STICKY_LEFT_COLUMN_WIDTH_EXPANDED}
            />

            {/* Sticky Left Column */}
            <StickyLeftColumn
              ROW_HEIGHT={ROW_HEIGHT}
              height={height}
              ROW_COUNT={ROW_COUNT}
              scrollTop={scrollTop}
              STICKY_LEFT_COLUMN_WIDTH={STICKY_LEFT_COLUMN_WIDTH}
              STICKY_LEFT_COLUMN_WIDTH_EXPANDED={STICKY_LEFT_COLUMN_WIDTH_EXPANDED}
              HEADER_ROW_HEIGHT={HEADER_ROW_HEIGHT}
              bleachers={bleachers}
            />

            {/* Right side (header + body) */}
            <div className="flex flex-col flex-1" style={{ marginLeft: STICKY_LEFT_COLUMN_WIDTH }}>
              <AutoSizer disableHeight>
                {({ width }) => (
                  <>
                    <StickyTopRow
                      ROW_HEIGHT={HEADER_ROW_HEIGHT}
                      width={width}
                      scrollLeft={scrollLeft}
                      COLUMN_WIDTH={COLUMN_WIDTH}
                      COLUMN_COUNT={COLUMN_COUNT}
                      dates={dates}
                    />

                    <MainScrollableGrid
                      ROW_HEIGHT={ROW_HEIGHT}
                      width={width}
                      COLUMN_WIDTH={COLUMN_WIDTH}
                      COLUMN_COUNT={COLUMN_COUNT}
                      height={height}
                      ROW_COUNT={ROW_COUNT}
                      onScroll={onScroll}
                      DATE_RANGE={DATE_RANGE}
                      bleachers={bleachers}
                      dates={dates}
                    />
                  </>
                )}
              </AutoSizer>
            </div>
          </div>
        );
      }}
    </ScrollSync>
  );
});

BleacherDashboard.displayName = "BleacherDashboard";
export default BleacherDashboard;
