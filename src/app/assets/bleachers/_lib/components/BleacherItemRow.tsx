"use client";

import { useRouter } from "next/navigation";
import { FormattedBleacher } from "../types";
import { FileText } from "lucide-react";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { formatInches } from "../functions";

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
  trailerHeightIn,
  trailerLengthIn,
  openingDirection,
  nvisPdfPath,
  zone,
}: FormattedBleacher) {
  const router = useRouter();
  const supabase = useClerkSupabaseClient();

  const handleClick = () => {
    router.push(`/assets/bleachers?edit=${bleacherNumber}`);
  };

  const handlePdfClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent row click / edit sheet opening
    if (!nvisPdfPath) return;
    const { data } = supabase.storage.from("bleacher-nvis").getPublicUrl(nvisPdfPath);
    window.open(data.publicUrl, "_blank");
  };

  return (
    <tr
      className={`group border-b border-gray-100 last:border-b-0 transition-colors duration-100 cursor-pointer ${
        deleted ? "bg-red-50/60 text-gray-400 hover:bg-red-50" : "hover:bg-darkBlue/[0.04]"
      }`}
      onClick={handleClick}
    >
      <td className="px-4 py-2.5 text-left font-semibold text-darkBlue tabular-nums">
        {bleacherNumber}
      </td>
      <td className="px-4 py-2.5 text-left tabular-nums">{bleacherRows}</td>
      <td className="px-4 py-2.5 text-left tabular-nums">{bleacherSeats}</td>
      <td className="px-4 py-2.5 text-left whitespace-nowrap text-gray-600">
        <div className="max-w-[150px] truncate" title={manufacturer ?? "—"}>
          {manufacturer ?? "—"}
        </div>
      </td>
      <td className="px-4 py-2.5 text-left whitespace-nowrap text-gray-500">
        <div className="max-w-[120px] truncate font-mono text-xs" title={vinNumber ?? "—"}>
          {vinNumber ?? "—"}
        </div>
      </td>
      <td className="px-4 py-2.5 text-left text-gray-600">{tagNumber ?? "—"}</td>
      <td className="px-4 py-2.5 text-left text-gray-600">{hitchType ?? "—"}</td>
      <td className="px-4 py-2.5 text-left text-gray-600 tabular-nums">
        {formatInches(trailerHeightIn)}
      </td>
      <td className="px-4 py-2.5 text-left text-gray-600 tabular-nums">
        {formatInches(trailerLengthIn)}
      </td>
      <td className="px-4 py-2.5 text-left text-gray-600 capitalize">{openingDirection ?? "—"}</td>
      <td className="px-4 py-2.5 text-left text-gray-600 tabular-nums">
        {gvwr != null ? `${gvwr.toLocaleString()} lbs` : "—"}
      </td>
      <td className="px-4 py-2.5 text-left">
        {zone.zoneName ? (
          <span className="inline-flex items-center rounded-full bg-darkBlue/[0.06] px-2 py-0.5 text-xs font-medium text-darkBlue">
            {zone.zoneName}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-left">
        {nvisPdfPath ? (
          <button
            onClick={handlePdfClick}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-lightBlue hover:bg-lightBlue/10 transition-colors"
            title="View NVIS PDF"
          >
            <FileText className="h-3.5 w-3.5" />
            View
          </button>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
    </tr>
  );
}
