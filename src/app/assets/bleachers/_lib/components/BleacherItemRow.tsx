"use client";

import { useRouter } from "next/navigation";
import { FormattedBleacher } from "../types";

// interface BleacherItemProps {
//   bleacherNumber: number;
//   bleacherRows: number;
//   bleacherSeats: number;
//   summerHomeBase: {
//     homeBaseId: number;
//     homeBaseName: string;
//   };
//   winterHomeBase: {
//     homeBaseId: number;
//     homeBaseName: string;
//   };
// }

export function BleacherItemRow({
  bleacherNumber,
  bleacherRows,
  bleacherSeats,
  deleted,
  hitchType,
  vinNumber,
  tagNumber,
  manufacturer,
  heightFoldedFt,
  gvwr,
  trailerLength,
  openingDirection,
  summerHomeBase,
  winterHomeBase,
}: FormattedBleacher) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/assets/bleachers?edit=${bleacherNumber}`);
  };

  return (
    <tr
      className={`border-b border-gray-200 hover:bg-gray-100 transition-all duration-100 ease-in-out cursor-pointer ${deleted ? "opacity-50 bg-red-50" : ""}`}
      onClick={handleClick}
    >
      <td className="p-3 text-left">{bleacherNumber}</td>
      <td className="p-3 text-left">{bleacherRows}</td>
      <td className="p-3 text-left">{bleacherSeats}</td>
      <td className="p-3 text-left whitespace-nowrap">
        <div className="max-w-[150px] truncate" title={manufacturer ?? "—"}>
          {manufacturer ?? "—"}
        </div>
      </td>
      <td className="p-3 text-left whitespace-nowrap">
        <div className="max-w-[120px] truncate font-mono text-xs" title={vinNumber ?? "—"}>
          {vinNumber ?? "—"}
        </div>
      </td>
      <td className="p-3 text-left">{tagNumber ?? "—"}</td>
      <td className="p-3 text-left">{hitchType ?? "—"}</td>
      <td className="p-3 text-left">{heightFoldedFt != null ? `${heightFoldedFt} ft` : "—"}</td>
      <td className="p-3 text-left">{trailerLength != null ? `${trailerLength} ft` : "—"}</td>
      <td className="p-3 text-left">{openingDirection ?? "—"}</td>
      <td className="p-3 text-left">{gvwr != null ? `${gvwr.toLocaleString()} lbs` : "—"}</td>
      <td className="p-3 text-left">{summerHomeBase.homeBaseName}</td>
      <td className="p-3 text-left">{winterHomeBase.homeBaseName}</td>
    </tr>
  );
}
