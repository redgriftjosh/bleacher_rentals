"use client";
import { useParams } from "next/navigation";
import { WeekList } from "../../../features/workTrackers/components/WeekList";

// type Props = {
//   params: { userId: string };
// };

export default function WorkTrackersForUserPage() {
  const params = useParams();
  const userId = params.userId as string;

  return (
    <table className="min-w-full border-collapse border border-gray-200">
      {/* Header */}
      <thead className="bg-gray-100">
        <tr className="border-b border-gray-200">
          <th className="p-3 text-left font-semibold">Week</th>
        </tr>
      </thead>

      <WeekList userId={userId} />
    </table>
  );
}
