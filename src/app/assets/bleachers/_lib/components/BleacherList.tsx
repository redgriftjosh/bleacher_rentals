"use client";
import { BleacherItemRow } from "./BleacherItemRow";
import { useBleachersWithHomeBases } from "../db";

export function BleacherList() {
  // const bleachers = fetchBleachers();

  // const bleachers = await fetchBleachersWithHomeBases();
  const bleachers = useBleachersWithHomeBases();
  console.log("bleachers:", bleachers);
  // const loading = useBleachersStore((s) => s.loading);
  // if (loading) return <BleacherListSkeleton />;
  return (
    <tbody>
      {bleachers.map((row, index) => (
        <BleacherItemRow
          key={index}
          {...row}
          winterHomeBase={{
            homeBaseId: row.winterHomeBase.homeBaseId,
            homeBaseName: row.winterHomeBase.winterHomeBaseName,
          }}
        />
      ))}
    </tbody>
  );
}
