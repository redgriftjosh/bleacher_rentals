import { LenientSelections } from "../LenientSelections";
import { Toggle } from "../Toggle";
import React, { useMemo } from "react";
import { Dropdown } from "@/components/DropDown";
import { Textarea } from "@/components/TextArea";
import { EventStatus, useCurrentEventStore } from "../../../useCurrentEventStore";
import { filterSelectedBleachers } from "../../../functions";
import { fetchBleachers } from "../../../db";
import BleacherRow from "../BleacherRow";
import BleacherLabel from "../../BleacherLabel";
import BleacherActivity from "./activities/BleacherActivity";
import AddNewActivity from "./activities/AddNewActivity";
import BleacherActivityClean from "./activities/BleacherActivityClean";

export const ActivitiesTab = () => {
  const currentEventStore = useCurrentEventStore();
  const bleachers = fetchBleachers();

  // const selectedBleachers = useMemo(() => {
  //   return filterSelectedBleachers(bleachers, currentEventStore.bleacherIds);
  // }, [currentEventStore.bleacherIds, bleachers]);

  return (
    <div className="max-h-[400px] overflow-y-auto p-4">
      {/* {selectedBleachers.map((bleacher) => (
        <>
          <BleacherLabel bleacher={selectedBleachers[0]} />
          <div className="ml-8">
            <BleacherActivity />
            <BleacherActivity />
            <BleacherActivityClean />
            <AddNewActivity />
          </div>
        </>
      ))} */}
    </div>
  );
};
