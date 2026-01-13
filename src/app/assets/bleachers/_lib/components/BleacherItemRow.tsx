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
  summerHomeBase,
  winterHomeBase,
}: FormattedBleacher) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/assets/bleachers?edit=${bleacherNumber}`);
  };

  return (
    <tr
      className="border-b border-gray-200 hover:bg-gray-100 transition-all duration-100 ease-in-out cursor-pointer"
      onClick={handleClick}
    >
      <td className="p-3 text-left">{bleacherNumber}</td>
      <td className="p-3 text-left">{bleacherRows}</td>
      <td className="p-3 text-left">{bleacherSeats}</td>
      <td className="p-3 text-left">{summerHomeBase.homeBaseName}</td>
      <td className="p-3 text-left">{winterHomeBase.homeBaseName}</td>
    </tr>
  );
}
