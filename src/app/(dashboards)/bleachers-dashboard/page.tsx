"use client";
import dynamic from "next/dynamic";
import FilterDashboard from "./_lib/_components/FilterDashboard";
import { useFilterDashboardStore } from "./_lib/useFilterDashboardStore";
import { CreateEventButton } from "./_lib/_components/event-configuration/CreateEventButton";
import { EventConfiguration } from "./_lib/_components/event-configuration/EventConfiguration";

const Dashboard = dynamic(() => import("./_lib/_components/dashboard/Dashboard"), {
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
      <EventConfiguration showSetupTeardown={true} />
      <Dashboard yAxis={yAxis} />
    </div>
  );
};

export default BleachersDashboardPage;
