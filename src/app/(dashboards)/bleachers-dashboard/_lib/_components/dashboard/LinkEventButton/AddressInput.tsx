"use client";
import { CircleAlert, Link, LoaderCircle, Unlink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { fetchEventAddressForWorkTracker, fetchEventPocForWorkTracker } from "./db";
import { EVENT_LIGHTNESS, EVENT_SATURATION } from "@/types/Constants";
import { useEffect } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import AddressAutocomplete from "@/app/(dashboards)/_lib/_components/AddressAutoComplete";
import { AddressData } from "../../../useCurrentEventStore";

export default function AddressInput({
  eventId,
  address,
  setAddress,
}: {
  eventId: number | null;
  address: AddressData | null;
  setAddress: (address: AddressData) => void;
}) {
  const { getToken } = useAuth();
  const {
    data: data,
    isLoading: isLoading,
    isError: isError,
  } = useQuery({
    queryKey: ["eventPocAddressForWorkTracker", eventId],
    queryFn: async () => {
      const token = await getToken({ template: "supabase" });
      return fetchEventAddressForWorkTracker(eventId!, token);
    },
    enabled: !!eventId,
    // refetchOnWindowFocus: false,
  });
  useEffect(() => {
    console.log("OverridablePOCInput data", data);
  }, [data]);

  const eventHsl = data
    ? `hsl(${data.hslHue}, ${EVENT_SATURATION}%, ${EVENT_LIGHTNESS}%)`
    : `hsl(0, ${EVENT_SATURATION}%, ${EVENT_LIGHTNESS}%)`;
  if (!eventId) {
    return (
      <AddressAutocomplete
        className="bg-white"
        onAddressSelect={(data) =>
          setAddress({
            ...data,
            addressId: address?.addressId ?? null,
          })
        }
        initialValue={address?.address || ""}
      />
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
                    {data?.address?.address ?? ""}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{data?.address?.address ?? ""}</p>
                  <p>Linked from event</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
