"use client";
import { memo, useEffect, useState } from "react";
import { AutoSizer, ScrollSync } from "react-virtualized";
import "react-virtualized/styles.css";
import { DateTime } from "luxon";
import { fetchBleachers, fetchDashboardEvents } from "../db";
import TopLeftCell from "./dashboard-components/event/TopLeftCell";
import StickyLeftColumn from "./dashboard-components/event/StickyLeftColumn";
import StickyTopRow from "./dashboard-components/event/StickyTopRow";
import MainScrollableGrid from "./dashboard-components/event/MainScrollableGrid";

const COLUMN_WIDTH = 100;
const STICKY_LEFT_COLUMN_WIDTH = 145;
const STICKY_LEFT_COLUMN_WIDTH_EXPANDED = STICKY_LEFT_COLUMN_WIDTH + 40;
const DATE_RANGE = 1000;
const HEADER_ROW_HEIGHT = 40;
const ROW_HEIGHT = 60;

const EventDashboard = memo(() => {
  const [height, setHeight] = useState(400);

  const dates: string[] = Array.from({ length: DATE_RANGE * 2 + 1 }, (_, i) =>
    DateTime.now()
      .plus({ days: i - DATE_RANGE })
      .toISODate()
  );
  const events = fetchDashboardEvents();
  const ROW_COUNT = events.length;

  const COLUMN_COUNT = dates.length;

  useEffect(() => {
    setHeight(window.innerHeight - 155);
    // 779 - 205
    // console.log("window.innerHeight", window.innerHeight);
  }, []);

  return (
    <ScrollSync>
      {({ scrollLeft, scrollTop, onScroll }) => {
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
              events={events}
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
                      events={events}
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

EventDashboard.displayName = "EventDashboard";
export default EventDashboard;
