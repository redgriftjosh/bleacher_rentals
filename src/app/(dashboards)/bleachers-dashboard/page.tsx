"use client";
import { Color } from "@/types/Color";
import { useEffect, useRef, useState } from "react";
import { DateTime } from "luxon";
import { CreateEventButton } from "./_lib/_components/CreateEventButton";
import { EventConfiguration } from "./_lib/_components/EventConfiguration";
import { BleacherTable } from "./_lib/_components/BleacherTable";
import dynamic from "next/dynamic";
import { fetchBleachers } from "./_lib/db";
import { Dropdown } from "@/components/DropDown";
import FilterDashboard from "./_lib/_components/FilterDashboard";
import { useFilterDashboardStore } from "./_lib/useFilterDashboardStore";
import EventDashboard from "./_lib/_components/EventDashboard";

const BleacherDashboard = dynamic(() => import("./_lib/_components/BleacherDashboard"), {
  ssr: false,
});

const BleachersDashboardPage = () => {
  const yAxis = useFilterDashboardStore((s) => s.yAxis);
  return (
    <div className="p-2">
      <div className="flex justify-between items-center">
        <FilterDashboard />
        <CreateEventButton />
      </div>
      <EventConfiguration />

      {yAxis === "Bleachers" ? <BleacherDashboard /> : <EventDashboard />}
    </div>
  );
};

export default BleachersDashboardPage;
