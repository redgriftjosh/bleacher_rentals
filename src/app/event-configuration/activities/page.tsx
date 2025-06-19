"use client";
import { useCurrentEventStore } from "@/app/(dashboards)/bleachers-dashboard/_lib/useCurrentEventStore";
import NewActivityButton from "../_lib/activities/NewActivityButton";
// import ActivityItem from "../_lib/activities/ActivityItem";
import AssignBleacherButton from "../_lib/activities/AssignBleachersButton";
import FullscreenModal from "../_lib/activities/AssignOverlay";
import { useEffect } from "react";
import BleacherListItem from "../_lib/activities/BleacherListItem";

export default function ActivitiesPage() {
  // const activities = useCurrentEventStore((s) => s.activities);
  const isFormExpanded = useCurrentEventStore((s) => s.isFormExpanded);
  useEffect(() => {
    console.log("isFormExpanded", isFormExpanded);
  }, [isFormExpanded]);

  return (
    <main>
      {isFormExpanded && <FullscreenModal />}
      <div className="flex flex-row gap-2">
        <h1 className="font-bold text-darkBlue text-2xl mb-2 mt-4">Activities</h1>
        <AssignBleacherButton />
      </div>
      {/* {activities.map((activity, index) => (
        <ActivityItem key={index} activity={activity} index={index} />
      ))} */}
      <BleacherListItem />
      <BleacherListItem />
    </main>
  );
}
