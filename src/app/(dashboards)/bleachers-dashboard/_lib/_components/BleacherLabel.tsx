import { DashboardBleacher } from "../types";

export default function BleacherLabel({ bleacher }: { bleacher: DashboardBleacher }) {
  return (
    <div className="flex items-start gap-2 ">
      {/* Bleacher Number */}
      <div
        className={`font-bold text-lg w-8 text-right ${
          bleacher.bleacherRows === 7
            ? "text-green-700"
            : bleacher.bleacherRows === 10
            ? "text-red-700"
            : bleacher.bleacherRows === 15
            ? "text-yellow-500"
            : ""
        }`}
      >
        {bleacher.bleacherNumber}
      </div>

      {/* Details */}
      <div className="flex flex-col text-xs leading-tight">
        <div className="text-gray-500">
          <span className="font-medium">{bleacher.bleacherRows}</span> row{" "}
          <span className="font-medium">{bleacher.bleacherSeats}</span> seats
        </div>
        <div>
          <span className="font-medium text-amber-500 mr-2">{bleacher.homeBase.homeBaseName}</span>
          <span className="font-medium text-blue-500">{bleacher.winterHomeBase.homeBaseName}</span>
        </div>
      </div>
    </div>
  );
}
