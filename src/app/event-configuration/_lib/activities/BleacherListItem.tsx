"use client";
import BleacherLabel from "@/app/(dashboards)/bleachers-dashboard/_lib/_components/BleacherLabel";
import { Trash2 } from "lucide-react";
import ActivityItem from "./ActivityItem";
import NewActivityButton from "./NewActivityButton";

export default function BleacherListItem() {
  const bleacher = {
    bleacherId: 1,
    bleacherNumber: 90,
    bleacherRows: 10,
    bleacherSeats: 100,
    homeBase: {
      homeBaseId: 1,
      homeBaseName: "Home Base 1",
    },
    winterHomeBase: {
      homeBaseId: 1,
      homeBaseName: "Home Base 1",
    },
    events: [],
  };
  return (
    <div
      // key={index}
      className=" bg-white border rounded p-3 mb-2 shadow-sm "
    >
      <div className="flex items-center gap-4 justify-between mb-2">
        <BleacherLabel bleacher={bleacher} />
        <button
          // onClick={deleteActivity}
          className="text-gray-500 hover:text-red-600 transition cursor-pointer"
          title="Delete requirement"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
      <ActivityItem
        activity={{
          activityType: "Transport",
          date: "",
          bleacherId: null,
          fromAddress: null,
          toAddress: null,
          address: null,
          userId: null,
        }}
        index={0}
      />
      <ActivityItem
        activity={{
          activityType: "Transport",
          date: "",
          bleacherId: null,
          fromAddress: null,
          toAddress: null,
          address: null,
          userId: null,
        }}
        index={0}
      />
      <NewActivityButton />
    </div>
  );
}
