"use client";
import FilterDashboard from "@/features/oldDashboard/_components/FilterDashboard";
import { useFilterDashboardStore } from "@/features/dashboardOptions/useFilterDashboardStore";
import dynamic from "next/dynamic";
import { CreateEventButton } from "@/features/eventConfiguration/components/CreateEventButton";
import { EventConfiguration } from "@/features/eventConfiguration/components/EventConfiguration";

const Dashboard = dynamic(
  () => import("../../features/oldDashboard/_components/dashboard/Dashboard"),
  {
    ssr: false,
  }
);

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
