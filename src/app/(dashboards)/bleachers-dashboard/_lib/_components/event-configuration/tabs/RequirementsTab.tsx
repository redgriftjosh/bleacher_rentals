"use client";
import { Toggle } from "../Toggle";
import React, { useEffect, useMemo } from "react";
import AddressAutocomplete from "@/app/(dashboards)/_lib/_components/AddressAutoComplete";
import { EventStatus, useCurrentEventStore } from "../../../useCurrentEventStore";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DatePicker } from "@/components/DatePicker";
import { DateTime } from "luxon";
import { Textarea } from "@/components/TextArea";
import { Dropdown } from "@/components/DropDown";
import { LenientSelections } from "../LenientSelections";
import { fetchBleachers } from "../../../db";
import { filterSelectedBleachers } from "../../../functions";
import BleacherLabel from "../../BleacherLabel";
import BleacherRow from "../BleacherRow";
import BleacherHeader from "../BleacherHeader";

export const RequirementsTab = () => {
  const currentEventStore = useCurrentEventStore();
  const bleachers = fetchBleachers();

  // Helper to clamp or auto-adjust invalid dates
  useEffect(() => {
    const s = currentEventStore;

    const oneDayBefore = (dateStr: string) => {
      const d = new Date(dateStr);
      d.setDate(d.getDate() - 1);
      return d.toISOString().split("T")[0];
    };

    const oneDayAfter = (dateStr: string) => {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + 1);
      return d.toISOString().split("T")[0];
    };

    // 1. Auto-set setupStart the first time eventStart is set
    if (s.eventStart && !s.setupStart) {
      s.setField("setupStart", oneDayBefore(s.eventStart));
    }

    // 2. Sync eventEnd with eventStart if it's too early
    if (s.eventStart && s.eventEnd && s.eventStart > s.eventEnd) {
      s.setField("eventEnd", s.eventStart);
    }

    // 3. Sync eventStart with eventEnd if it's too late
    if (s.eventStart && s.eventEnd && s.eventEnd < s.eventStart) {
      s.setField("eventStart", s.eventEnd);
    }

    // 4. Setup must be before eventStart
    if (s.setupStart && s.eventStart && s.setupStart >= s.eventStart) {
      s.setField("setupStart", oneDayBefore(s.eventStart));
    }

    // 5. Teardown must be after eventEnd
    if (s.teardownEnd && s.eventEnd && s.teardownEnd <= s.eventEnd) {
      s.setField("teardownEnd", oneDayAfter(s.eventEnd));
    }
  }, [
    currentEventStore.eventStart,
    currentEventStore.eventEnd,
    currentEventStore.setupStart,
    currentEventStore.teardownEnd,
  ]);

  // const selectedBleachers = useMemo(() => {
  //   return filterSelectedBleachers(bleachers, currentEventStore.bleacherIds);
  // }, [currentEventStore.bleacherIds, bleachers]);

  return (
    <div className="max-h-[300px] overflow-y-auto p-4">
      <h1 className="font-bold text-darkBlue">Event</h1>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-row gap-2">
          <LenientSelections />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <Textarea
            placeholder="Type your message here."
            value={currentEventStore.notes}
            onChange={(e) => currentEventStore.setField("notes", e.target.value)}
          />
        </div>
      </div>
      <h1 className="font-bold text-darkBlue ">Per Bleacher</h1>
      <BleacherHeader />
      {/* {selectedBleachers.map((bleacher) => (
        <BleacherRow bleacher={bleacher} />
      ))} */}
    </div>
  );
};
