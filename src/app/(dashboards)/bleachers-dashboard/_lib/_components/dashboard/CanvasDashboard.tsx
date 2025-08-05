"use client";
import { useEffect, useMemo, useState } from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Sprite, Text } from "pixi.js";
import { DateTime } from "luxon";
import { useCurrentEventStore } from "../../useCurrentEventStore";
import { useFilterDashboardStore, YAxis } from "../../useFilterDashboardStore";
import { fetchBleachers, fetchDashboardEvents } from "../../db";
import { filterEvents, filterSortBleachers } from "../../functions";

const CELL_WIDTH = 100;
const ROW_HEIGHT = 60;
const HEADER_HEIGHT = 40;

type DashboardProps = {
  yAxis: YAxis;
};

export default function CanvasDashboard({ yAxis }: DashboardProps) {
  const [viewport, setViewport] = useState({ width: 800, height: 600 });
  const bleacherIds = useCurrentEventStore((s) => s.bleacherIds);
  const isFormExpanded = useCurrentEventStore((s) => s.isFormExpanded);

  const homeBaseIds = useFilterDashboardStore((s) => s.homeBaseIds);
  const winterHomeBaseIds = useFilterDashboardStore((s) => s.winterHomeBaseIds);
  const rows = useFilterDashboardStore((s) => s.rows);
  const stateProvinces = useFilterDashboardStore((s) => s.stateProvinces);

  const bleachers = fetchBleachers();
  const events = fetchDashboardEvents();

  const dates: string[] = useMemo(() => {
    return Array.from({ length: 201 }, (_, i) =>
      DateTime.now()
        .plus({ days: i - 100 })
        .toISODate()
    );
  }, []);

  const sortedBleachers = useMemo(() => {
    return filterSortBleachers(
      homeBaseIds,
      winterHomeBaseIds,
      rows,
      bleachers,
      bleacherIds,
      isFormExpanded
    );
  }, [homeBaseIds, winterHomeBaseIds, rows, bleachers, bleacherIds, isFormExpanded]);

  const sortedEvents = useMemo(() => {
    return filterEvents(events, stateProvinces);
  }, [events, stateProvinces]);

  useEffect(() => {
    const handleResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight - 100 });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <Stage width={viewport.width} height={viewport.height} options={{ backgroundColor: 0xffffff }}>
      <Container x={0} y={0}>
        {/* Render Column Headers */}
        {dates.map((date, colIndex) => (
          <Text
            key={colIndex}
            text={DateTime.fromISO(date).toFormat("MMM dd")}
            x={colIndex * CELL_WIDTH}
            y={0}
            style={{ fontSize: 14, fill: "black" }}
          />
        ))}

        {/* Render Rows */}
        {sortedBleachers.map((bleacher, rowIndex) => (
          <Container key={bleacher.bleacherId} y={(rowIndex + 1) * ROW_HEIGHT}>
            {/* Left sticky label */}
            <Text
              text={`#${bleacher.bleacherNumber}`}
              x={0}
              y={0}
              style={{ fontSize: 14, fill: "black" }}
            />

            {/* Render Cells */}
            {dates.map((_, colIndex) => {
              const x = colIndex * CELL_WIDTH + 100; // shift to the right of sticky label
              return (
                <Graphics
                  key={colIndex}
                  draw={(g) => {
                    g.clear();
                    g.beginFill(0xf0f0f0);
                    g.drawRect(x, 0, CELL_WIDTH - 1, ROW_HEIGHT - 1);
                    g.endFill();
                  }}
                />
              );
            })}
          </Container>
        ))}
      </Container>
    </Stage>
  );
}
