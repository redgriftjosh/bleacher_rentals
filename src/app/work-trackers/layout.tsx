"use client";
import { Color } from "@/types/Color";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchUserById } from "./_lib/db";
import { DateTime } from "luxon";

export default function WorkTrackersLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const userId = params.userId as string | undefined;
  const startDate = params.startDate as string | undefined;

  const { getToken } = useAuth();

  const { data: user } = useQuery({
    queryKey: ["user", userId],
    queryFn: async () => {
      const token = await getToken({ template: "supabase" });
      return fetchUserById(token, userId!);
    },
    enabled: !!userId,
  });
  const name = userId && user ? ` - ${user}` : "";
  const dateRange = startDate
    ? (() => {
        const start = DateTime.fromISO(startDate);
        if (!start.isValid) return "";

        const end = start.plus({ days: 6 });
        return ` - ${start.toFormat("MMMM d")} to ${end.toFormat("MMMM d")}`;
      })()
    : "";
  return (
    <main className="p-4">
      <div className="flex justify-between items-center mb-4">
        {/* Left Side: Title & Description */}
        <div>
          <h1 className="text-2xl text-darkBlue font-bold">
            Work Trackers{name}
            {dateRange}
          </h1>
          <p className="text-sm" style={{ color: Color.GRAY }}>
            Manage work trackers here.
          </p>
        </div>
      </div>
      {children}
    </main>
  );
}
