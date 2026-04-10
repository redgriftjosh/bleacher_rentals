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
  summerHomeBase,
  winterHomeBase,
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
      <td className="p-3 text-left">{formatInches(trailerHeightIn)}</td>
      <td className="p-3 text-left">{formatInches(trailerLengthIn)}</td>
      <td className="p-3 text-left">{openingDirection ?? "—"}</td>
      <td className="p-3 text-left">{gvwr != null ? `${gvwr.toLocaleString()} lbs` : "—"}</td>
      <td className="p-3 text-left">{summerHomeBase.homeBaseName}</td>
      <td className="p-3 text-left">{winterHomeBase.homeBaseName}</td>
      <td className="p-3 text-left">
        {nvisPdfPath ? (
          <button
            onClick={handlePdfClick}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
            title="View NVIS PDF"
          >
            <FileText className="h-4 w-4" />
            View
          </button>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
    </tr>
  );
}