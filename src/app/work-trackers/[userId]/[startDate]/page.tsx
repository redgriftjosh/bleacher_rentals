"use client";
import { useAuth } from "@clerk/nextjs";
import { TripList } from "../../_lib/components/TripList";
import { useParams } from "next/navigation";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { createSuccessToast } from "@/components/toasts/SuccessToast";

// type Props = {
//   params: {
//     userId: string;
//     startDate: string;
//   };
// };

export default function WorkTrackersForUserPage() {
  // const { userId, startDate } = params;
  const params = useParams();
  const userId = params.userId as string;
  const startDate = params.startDate as string;
  const className = "py-2 text-center text-xs font-semibold border-r";
  const { getToken } = useAuth();

  const handleDownload = async () => {
    const token = await getToken({ template: "supabase" });
    if (!token) {
      alert("You must be signed in to download.");
      return;
    }

    const res = await fetch(`/work-trackers/${userId}/${startDate}/pdf`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      createErrorToast(["Failed to download PDF", res.statusText]);
    } else {
      createSuccessToast(["PDF Downloaded"]);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    // Create a temporary link to trigger download
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `work-trackers-${userId}-${startDate}.pdf`);
    document.body.appendChild(link);
    link.click();

    // Clean up
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* put a button that says "Download PDF"  */}
      <button
        onClick={handleDownload}
        // href={`/work-trackers/${userId}/${startDate}/pdf`}
        className="px-4 py-2 bg-darkBlue text-white text-sm font-semibold rounded shadow-md hover:bg-lightBlue transition cursor-pointer"
      >
        Download PDF
      </button>

      <table className="min-w-full border-collapse border border-gray-200 mt-4">
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
    </div>
  );
}
