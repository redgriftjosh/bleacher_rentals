"use client";
import { useBleachersStore } from "@/state/bleachersStore";
import { fetchBleachers } from "../db";
import { BleacherItemRow } from "./BleacherItemRow";

export function BleacherList() {
  // const bleachers = await fetchBleachers();
  // const bleachers = useBleachersStore((s) => s.bleachers);
  // console.log("bleachers: ", bleachers);
  const bleachers = fetchBleachers();
  return (
    <tbody>
      {bleachers.map((row, index) => (
        // <BleacherItemRow
        //   key={index}
        //   bleacherNumber={row.bleacher_number}
        //   bleacherRows={row.bleacher_rows}
        //   bleacherSeats={row.bleacher_seats}
        //   homeBase={row.home_base_id}
        //   winterHomeBase={row.winter_home_base_id}
        // />
        <BleacherItemRow key={index} {...row} />
      ))}
    </tbody>
  );
}
