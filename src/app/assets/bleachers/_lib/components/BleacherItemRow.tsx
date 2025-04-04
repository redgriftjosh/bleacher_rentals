"use client";
interface BleacherItemProps {
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
}

export function BleacherItemRow({
  bleacherNumber,
  bleacherRows,
  bleacherSeats,
  homeBase,
  winterHomeBase,
}: BleacherItemProps) {
  return (
    <tr
      className="border-b border-gray-200 hover:bg-gray-100 transition-all duration-100 ease-in-out cursor-pointer"
      // onClick={onEdit}
    >
      <td className="p-3 text-left">{bleacherNumber}</td>
      <td className="p-3 text-left">{bleacherRows}</td>
      <td className="p-3 text-left">{bleacherSeats}</td>
      <td className="p-3 text-left">{homeBase.homeBaseName}</td>
      <td className="p-3 text-left">{winterHomeBase.homeBaseName}</td>
    </tr>
  );
}
