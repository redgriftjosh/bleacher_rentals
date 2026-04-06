"use client";

import { useState } from "react";
import { DriverCalendar } from "./_lib/components/DriverCalendar";

export default function DriverCalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const handlePrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  return (
    <main className="h-full flex flex-col">
      <DriverCalendar year={year} month={month} onPrev={handlePrev} onNext={handleNext} />
    </main>
  );
}
