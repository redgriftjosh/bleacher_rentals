import { FormattedBleacher } from "@/app/assets/bleachers/_lib/types";
import { useBleachersStore } from "@/state/bleachersStore";
import { useHomeBasesStore } from "@/state/homeBaseStore";
import { SelectBleacher } from "@/types/tables/Bleachers";
import { SelectHomeBase } from "@/types/tables/HomeBases";

export function fetchBleachers() {
  const bleachers = useBleachersStore((s) => s.bleachers) as SelectBleacher[];
  const homeBases = useHomeBasesStore((s) => s.homeBases) as SelectHomeBase[];

  if (!bleachers || !homeBases) return [];

  const formattedBleachers: FormattedBleacher[] = bleachers
    .map((bleacher) => {
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
    })
    .sort((a, b) => b.bleacherNumber - a.bleacherNumber);

  return formattedBleachers;
}
