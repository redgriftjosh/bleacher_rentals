"use client";
import { memo, useEffect, useMemo, useState } from "react";
import { AutoSizer, ScrollSync } from "react-virtualized";
import "react-virtualized/styles.css";
import { DateTime } from "luxon";
import { useCurrentEventStore } from "../../useCurrentEventStore";
import { useFilterDashboardStore, YAxis } from "../../useFilterDashboardStore";
import { fetchBleachers, fetchDashboardEvents } from "../../db";
import { DashboardBleacher } from "../../types";
import TopLeftCell from "./TopLeftCell";
import StickyLeftColumn from "./StickyLeftColumn";
import StickyTopRow from "./StickyTopRow";
import MainScrollableGrid from "./MainScrollableGrid";
import { filterSortBleachers } from "../../functions";

const COLUMN_WIDTH = 100;
const STICKY_LEFT_COLUMN_WIDTH = 185;
const STICKY_LEFT_COLUMN_WIDTH_EXPANDED = STICKY_LEFT_COLUMN_WIDTH + 40;
const DATE_RANGE = 1000;
const HEADER_ROW_HEIGHT = 40;
const ROW_HEIGHT = 60;

type DashboardProps = {
  yAxis: YAxis;
};

const Dashboard = memo(({ yAxis }: DashboardProps) => {
  const [height, setHeight] = useState(400);
  const isFormExpanded = useCurrentEventStore((s) => s.isFormExpanded);
  const homeBaseIds = useFilterDashboardStore((s) => s.homeBaseIds);
  const winterHomeBaseIds = useFilterDashboardStore((s) => s.winterHomeBaseIds);
  const rows = useFilterDashboardStore((s) => s.rows);
  const selectedBleachers = useCurrentEventStore((s) => s.bleachers);

  const dates: string[] = Array.from({ length: DATE_RANGE * 2 + 1 }, (_, i) =>
    DateTime.now()
      .plus({ days: i - DATE_RANGE })
      .toISODate()
  );
  const bleachers = fetchBleachers();
  const events = fetchDashboardEvents();

  const COLUMN_COUNT = dates.length;

  useEffect(() => {
    setHeight(window.innerHeight - 155);
    // 779 - 205
    // console.log("window.innerHeight", window.innerHeight);
  }, []);

  // when the user changes their filtering options in useFilterDashboardStore this will run
  const sortedBleachers = useMemo(() => {
    // console.log("filterSortBleachers re-running due to dependency change");
    return filterSortBleachers(
      homeBaseIds,
      winterHomeBaseIds,
      rows,
      bleachers,
      selectedBleachers.map((b) => b.bleacherId),
      isFormExpanded
    );
  }, [homeBaseIds, winterHomeBaseIds, rows, bleachers, selectedBleachers, isFormExpanded]);

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
              yAxis={yAxis}
            />

            {/* Sticky Left Column */}
            <StickyLeftColumn
              ROW_HEIGHT={ROW_HEIGHT}
              height={height}
              scrollTop={scrollTop}
              STICKY_LEFT_COLUMN_WIDTH={STICKY_LEFT_COLUMN_WIDTH}
              STICKY_LEFT_COLUMN_WIDTH_EXPANDED={STICKY_LEFT_COLUMN_WIDTH_EXPANDED}
              HEADER_ROW_HEIGHT={HEADER_ROW_HEIGHT}
              bleachers={sortedBleachers}
              events={events}
              yAxis={yAxis}
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
                      onScroll={onScroll}
                      DATE_RANGE={DATE_RANGE}
                      bleachers={sortedBleachers}
                      events={events}
                      yAxis={yAxis}
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

Dashboard.displayName = "Dashboard";
export default Dashboard;
