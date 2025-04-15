"use client";
import { Color } from "@/types/Color";
import { useEffect, useRef, useState } from "react";
import { DateTime } from "luxon";
import { CreateEventButton } from "./_lib/_components/CreateEventButton";
import { EventConfiguration } from "./_lib/_components/EventConfiguration";
import { BleacherTable } from "./_lib/_components/BleacherTable";

const BleachersDashboardPage = () => {
  const initialDays = 300; // Initial ±50 days range
  const cellWidth = 100; // in pixels
  const daysToAdd = 200; // Number of days to add when scrolling
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - initialDays))
  );
  const [daysToShow, setDaysToShow] = useState(initialDays * 2);
  const tableRef = useRef<HTMLDivElement>(null);

  // Function to generate a range of dates dynamically
  const generateDates = (startDate: Date, days: number) => {
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      return date.toISOString().split("T")[0]; // Format as YYYY-MM-DD
    });
  };

  useEffect(() => {
    if (!tableRef.current) {
      return;
    }

    setTimeout(() => {
      const todayCell = tableRef.current?.querySelector("#today");
      if (!todayCell) {
        console.warn("🚨 Could not find today cell (#today)");
      } else {
        todayCell.scrollIntoView({ behavior: "instant", block: "nearest", inline: "center" });
      }
    }, 0);
  }, [tableRef.current]); // 👈 Runs again when `tableRef` updates

  const handleScroll = () => {
    if (!tableRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = tableRef.current;
    // console.log("scrollLeft", scrollLeft, "scrollWidth", scrollWidth, "clientWidth", clientWidth);

    if (scrollLeft === 0) {
      tableRef.current.scrollLeft = cellWidth * daysToAdd;
      setStartDate((prev) => {
        const newStart = new Date(prev);
        newStart.setDate(newStart.getDate() - daysToAdd); // Extend 30 more days
        return newStart;
      });
      setDaysToShow((prev) => prev + daysToAdd);
    } else if (scrollLeft + clientWidth >= scrollWidth - 10) {
      // console.log("scrollRight");
      setDaysToShow((prev) => prev + daysToAdd);
    }
  };

  const dates = generateDates(startDate, daysToShow); // Generate updated dates

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        {/* Left Side: Title & Description */}
        <div>
          <h1 className="text-2xl text-darkBlue font-bold">Bleacher Dashboard</h1>
          <p className="text-sm" style={{ color: Color.GRAY }}>
            See all your bleachers and their events.
          </p>
        </div>

        {/* Right Side: Invite New Member Button */}
        <CreateEventButton />
      </div>
      <EventConfiguration />
      {BleacherTable(dates, tableRef, handleScroll, cellWidth, DateTime)}
    </div>
  );
};

export default BleachersDashboardPage;
