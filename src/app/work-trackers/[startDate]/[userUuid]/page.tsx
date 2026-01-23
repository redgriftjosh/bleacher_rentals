"use client";

import { TripList } from "../../../../features/workTrackers/components/TripList";
import WorkTrackerModal from "../../../../features/workTrackers/components/WorkTrackerModal";
import { useParams } from "next/navigation";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import { use, useState } from "react";
import { Tables } from "../../../../../database.types";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";

const getRandomLoadingMessage = () => {
  const messages = [
    "Hmm...",
    "Hold on...",
    "Just a sec...",
    "Working on it...",
    "Beep boop...",
    "Loading magic...",
    "Hold your horses...",
    "Here we go again...",
    "Generating PDF (reluctantly)...",
  ];
  return messages[Math.floor(Math.random() * messages.length)];
};

export default function WorkTrackersForUserPage() {
  const params = useParams();
  const supabase = useClerkSupabaseClient();
  const startDate = params.startDate as string;
  const userUuid = params.userUuid as string;
  const className = "py-2 text-center text-xs font-semibold border-r";
  const [selectedWorkTracker, setSelectedWorkTracker] = useState<Tables<"WorkTrackers"> | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    setIsLoading(true);
    if (!supabase) {
      alert("You must be signed in to download.");
      setIsLoading(false);
      return;
    }

    const res = await fetch(`/work-trackers/${startDate}/${userUuid}/pdf`, {
      method: "GET",
      // headers: {
      //   Authorization: `Bearer ${token}`,
      // },
    });

    if (!res.ok) {
      setIsLoading(false);
      createErrorToast(["Failed to download PDF", res.statusText]);
    } else {
      setIsLoading(false);
      createSuccessToast(["PDF Downloaded"]);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    // Create a temporary link to trigger download
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `work-trackers-${userUuid}-${startDate}.pdf`);
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
        disabled={isLoading}
        className="px-4 py-2 bg-darkBlue text-white text-sm font-semibold rounded shadow-md hover:bg-lightBlue transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? getRandomLoadingMessage() : "Download PDF"}
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
        <TripList
          userUuid={userUuid}
          startDate={startDate}
          onSelectWorkTracker={(wt) => setSelectedWorkTracker(wt)}
        />
      </table>

      {/* Modal lives outside the table for proper semantics */}
      <WorkTrackerModal
        selectedWorkTracker={selectedWorkTracker}
        setSelectedWorkTracker={setSelectedWorkTracker}
        setSelectedBlock={() => {}}
      />
    </div>
  );
}
