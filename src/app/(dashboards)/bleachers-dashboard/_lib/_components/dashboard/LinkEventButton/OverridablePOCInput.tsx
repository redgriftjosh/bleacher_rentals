"use client";
import { CircleAlert, Link, LoaderCircle, Unlink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { fetchEventPocForWorkTracker } from "./db";
import { EVENT_LIGHTNESS, EVENT_SATURATION } from "@/types/Constants";
import { useEffect } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function OverridablePOCInput({
  eventId,
  override,
  poc,
  setOverride,
  setPoc,
}: {
  eventId: number | null;
  override: boolean;
  poc: string | null;
  setOverride: (override: boolean) => void;
  setPoc: (poc: string) => void;
}) {
  const { getToken } = useAuth();
  const {
    data: data,
    isLoading: isLoading,
    isError: isError,
  } = useQuery({
    queryKey: ["eventPocForWorkTracker", eventId],
    queryFn: async () => {
      const token = await getToken({ template: "supabase" });
      return fetchEventPocForWorkTracker(eventId!, token);
    },
    enabled: !!eventId && !override,
    // refetchOnWindowFocus: false,
  });
  // useEffect(() => {
  //   console.log("OverridablePOCInput data", data);
  // }, [data]);

  const eventHsl = data
    ? `hsl(${data.hslHue}, ${EVENT_SATURATION}%, ${EVENT_LIGHTNESS}%)`
    : `hsl(0, ${EVENT_SATURATION}%, ${EVENT_LIGHTNESS}%)`;
  if (!eventId || override) {
    return (
      <div className="flex flex-row gap-2 items-center w-full">
        <input
          type="text"
          className="w-full p-2 border rounded bg-white"
          placeholder="Pickup POC"
          value={poc ?? ""}
          onChange={(e) => setPoc(e.target.value)}
        />
        {eventId && (
          <Link
            className="h-4 w-4 hover:h-5 hover:w-5 transition-all cursor-pointer mb-0"
            onClick={() => setOverride(false)}
          />
        )}
      </div>
    );
  }
  if (isLoading) {
    return <LoaderCircle className="text-greenAccent animate-spin" />;
  }
  if (isError) {
    return <CircleAlert className="text-red-700" />;
  }
  return (
    <div>
      <div className="flex flex-row gap-2 items-center w-full">
        <div
          className="flex-1 min-w-0 py-1 px-2 border rounded   "
          style={{
            backgroundColor: eventHsl,
            height: "42px",
          }}
        >
          <div className="flex gap-2 items-center -mb-1 w-full">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mt-0.5 text-black whitespace-nowrap overflow-hidden text-ellipsis truncate max-w-full">
                    {data?.poc ?? ""}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{data?.poc ?? ""}</p>
                  <p>Linked from event</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <Unlink
          className="h-4 w-4 hover:h-5 hover:w-5 transition-all cursor-pointer "
          onClick={() => setOverride(true)}
        />
      </div>
    </div>
  );
}
