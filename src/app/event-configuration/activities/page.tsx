"use client";
import { useCurrentEventStore } from "@/app/(dashboards)/bleachers-dashboard/_lib/useCurrentEventStore";
import NewActivityButton from "../_lib/activities/NewActivityButton";
import ActivityItem from "../_lib/activities/ActivityItem";

export default function ActivitiesPage() {
  const activities = useCurrentEventStore((s) => s.activities);

  return (
    <main>
      <h1 className="font-bold text-darkBlue text-2xl mb-2 mt-4">Activities</h1>
      // how would I add the new activity item list here?
      <NewActivityButton />
      {activities.map((activity, index) => (
        <ActivityItem key={index} activity={activity} index={index} />
      ))}
    </main>
  );
}
