"use client";
import { useBleachersStore } from "@/state/bleachersStore";
import { useHomeBasesStore } from "@/state/homeBaseStore";

type RawHomeBase = {
  home_base_id: number;
  home_base_name: string;
  created_at: string;
};

type RawBleacher = {
  bleacher_id: number;
  created_at: string;
  bleacher_number: number;
  home_base_id: number;
  winter_home_base_id: number;
  bleacher_rows: number;
  bleacher_seats: number;
};

type FormattedBleacher = {
  bleacherNumber: number;
  bleacherRows: number;
  bleacherSeats: number;
  homeBase: {
    homeBaseId: number;
    homeBaseName: string;
  };
  winterHomeBase: {
    homeBaseId: number;
    homeBaseName: string;
  };
};

export function fetchBleachers() {
  const bleachers = useBleachersStore((s) => s.bleachers) as RawBleacher[];
  const homeBases = useHomeBasesStore((s) => s.homeBases) as RawHomeBase[];
  console.log("bleachers: ", bleachers);
  console.log("homeBases: ", homeBases);

  const formattedBleachers: FormattedBleacher[] = bleachers.map((bleacher) => {
    const homeBase = homeBases.find((base) => base.home_base_id === bleacher.home_base_id);
    const winterHomeBase = homeBases.find(
      (base) => base.home_base_id === bleacher.winter_home_base_id
    );

    return {
      bleacherNumber: bleacher.bleacher_number,
      bleacherRows: bleacher.bleacher_rows,
      bleacherSeats: bleacher.bleacher_seats,
      homeBase: {
        homeBaseId: homeBase?.home_base_id ?? 0,
        homeBaseName: homeBase?.home_base_name ?? "",
      },
      winterHomeBase: {
        homeBaseId: winterHomeBase?.home_base_id ?? 0,
        homeBaseName: winterHomeBase?.home_base_name ?? "",
      },
    };
  });
  console.log("formattedBleachers: ", formattedBleachers);

  return formattedBleachers;
}
