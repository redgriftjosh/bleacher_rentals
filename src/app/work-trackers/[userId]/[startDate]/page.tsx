import { TripList } from "../../_lib/components/TripList";

type Props = {
  params: {
    userId: string;
    startDate: string;
  };
};

export default function WorkTrackersForUserPage({ params }: Props) {
  const { userId, startDate } = params;
  const className = "py-2 text-center text-xs font-semibold border-r";

  return (
    <table className="min-w-full border-collapse border border-gray-200">
      {/* Header */}
      <thead className="bg-gray-100">
        <tr>
          <th className={`w-[8%] ${className}`}>Date</th>
          <th className={`w-[8%] ${className}`}>Bleacher</th>
          <th className={`w-[12%] ${className}`}>Pickup Location</th>
          <th className={`w-[8%] ${className}`}>POC at P/U</th>
          <th className={`w-[7%] ${className}`}>Time</th>
          <th className={`w-[12%] ${className}`}>Dropoff Location</th>
          <th className={`w-[8%] ${className}`}>POC at D/O</th>
          <th className={`w-[7%] ${className}`}>Time</th>
          <th className={`w-[8%] ${className}`}>Pay</th>
          <th className={` ${className}`}>Notes</th>
        </tr>
      </thead>

      <TripList userId={userId} startDate={startDate} />
    </table>
  );
}
