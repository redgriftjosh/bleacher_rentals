import { Link, X, Trash2, Calculator } from "lucide-react";
import { Dropdown } from "@/components/DropDown";
import { useEffect, useState, useRef } from "react";
import AddressAutocomplete from "@/components/AddressAutoComplete";
import {
  getAddressFromUuid,
  saveWorkTracker,
  deleteWorkTracker,
} from "../../dashboard/db/client/db";
import { AddressData } from "../../eventConfiguration/state/useCurrentEventStore";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Tables } from "../../../../database.types";
import { fetchBleachersForOptions, fetchDriverPaymentData } from "@/app/team/_lib/db";
import { toLatLngString, calculateDriverPay } from "../util";
import RouteMapPreview from "./RouteMapPreview";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { getDriversWithUsers } from "../db/getDrivers.db";
import WorkTrackerStatusBadge from "./WorkTrackerStatusBadge";
import { EditBlock } from "@/features/dashboard/types";
import { fetchWorkTrackerByUuid } from "@/features/dashboard/db/client/fetchWorkTracker";

type WorkTrackerModalProps = {
  selectedWorkTracker: Tables<"WorkTrackers"> | null;
  setSelectedWorkTracker: (block: Tables<"WorkTrackers"> | null) => void;
  setSelectedBlock: (block: EditBlock | null) => void;
};

import { useDrivers } from "../hooks/useDrivers.db";
import { useCurrentUser } from "@/hooks/db/useCurrentUser";

export default function WorkTrackerModal({
  selectedWorkTracker,
  setSelectedWorkTracker,
  setSelectedBlock,
}: WorkTrackerModalProps) {
  const supabase = useClerkSupabaseClient();
  const queryClient = useQueryClient();
  const { data: currentUserData } = useCurrentUser();
  const currentUser = currentUserData?.[0];
  const isAdmin = currentUser?.is_admin === 1;

  // Fetch drivers with user data using PowerSync
  const { data: drivers = [], isLoading: isDriversLoading, error: driversError } = useDrivers();

  const [workTracker, setWorkTracker] = useState<Tables<"WorkTrackers"> | null>(
    selectedWorkTracker,
  );
  const pickupAddress = getAddressFromUuid(selectedWorkTracker?.pickup_address_uuid ?? null);
  const dropoffAddress = getAddressFromUuid(selectedWorkTracker?.dropoff_address_uuid ?? null);
  const [pickUpAddress, setPickUpAddress] = useState<AddressData | null>(pickupAddress);
  const [dropOffAddress, setDropOffAddress] = useState<AddressData | null>(dropoffAddress);

  const [payInput, setPayInput] = useState(
    selectedWorkTracker?.pay_cents != null ? (selectedWorkTracker?.pay_cents / 100).toFixed(2) : "",
  );

  // Helper to format address for Distance Matrix API
  const formatAddressString = (addr: AddressData | null): string => {
    if (!addr) return "";
    // If the address already contains city/state (common for our stored addresses),
    // just use the address field
    if (
      addr.address &&
      addr.city &&
      (addr.address.includes(addr.city) || addr.address.includes(","))
    ) {
      return addr.address;
    }
    // Otherwise, build the full address
    const parts = [addr.address, addr.city, addr.state, addr.postalCode].filter(Boolean);
    return parts.join(", ");
  };

  // Try lat/lng first, fallback to address string
  const origin = toLatLngString(pickUpAddress ?? undefined) || formatAddressString(pickUpAddress);
  const dest = toLatLngString(dropOffAddress ?? undefined) || formatAddressString(dropOffAddress);

  const distanceQueryEnabled = Boolean(origin && dest);

  // Debug logging
  console.log("Distance Query Debug:", {
    origin,
    dest,
    pickUpPlaceId: pickUpAddress?.placeId,
    dropOffPlaceId: dropOffAddress?.placeId,
    distanceQueryEnabled,
    pickUpAddress,
    dropOffAddress,
  });

  const {
    data: leg,
    isFetching: isLegFetching,
    error: legErr,
  } = useQuery({
    queryKey: ["gmaps-distance", origin, dest],
    enabled: distanceQueryEnabled,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await fetch(
        `/api/distance?origin=${encodeURIComponent(origin)}&dest=${encodeURIComponent(dest)}`,
      );
      if (!res.ok) throw new Error(`Distance API failed (${res.status})`);
      return res.json() as Promise<{
        distanceMeters: number | null;
        distanceText: string | null;
        durationSeconds: number | null;
        durationText: string | null;
        durationInTrafficSeconds?: number | null;
        durationInTrafficText?: string | null;
      }>;
    },
  });

  useEffect(() => {
    setWorkTracker(selectedWorkTracker);
    setPayInput(
      selectedWorkTracker?.pay_cents != null
        ? (selectedWorkTracker?.pay_cents / 100).toFixed(2)
        : "",
    );
  }, [selectedWorkTracker]);

  // useEffect(() => {
  //   if (workTracker?.pay_cents != null) {
  //     setPayInput((workTracker.pay_cents / 100).toFixed(2));
  //   }
  // }, [workTracker?.pay_cents]);

  // console.log("selectedWorkTracker WorkTrackerModal", selectedWorkTracker);

  // Bleacher options for the dropdown
  const {
    data: bleacherOptions,
    isLoading: isBleachersLoading,
    isError: isBleachersError,
  } = useQuery({
    queryKey: ["bleacherOptions"],
    queryFn: async () => {
      return fetchBleachersForOptions(supabase);
    },
  });

  // Fetch driver payment data when driver is selected
  const selectedDriver = drivers?.find((d) => d.driver_uuid === workTracker?.driver_uuid);
  const {
    data: driverPaymentData,
    isLoading: isDriverPaymentLoading,
    isError: isDriverPaymentError,
  } = useQuery({
    queryKey: ["driverPayment", workTracker?.driver_uuid],
    queryFn: async () => {
      return fetchDriverPaymentData(selectedDriver!.user_uuid, supabase);
    },
    enabled: !!workTracker?.driver_uuid && !!selectedDriver,
  });

  const {
    data: fetchedWorkTracker,
    isLoading: isWorkTrackerLoading,
    isError: isWorkTrackerError,
  } = useQuery({
    queryKey: ["workTracker", selectedWorkTracker?.id],
    queryFn: async () => {
      return fetchWorkTrackerByUuid(selectedWorkTracker!.id, supabase);
    },
    enabled: !!selectedWorkTracker && selectedWorkTracker.id !== "-1",
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (selectedWorkTracker?.id === "-1") {
      setWorkTracker(selectedWorkTracker);
      setPickUpAddress(null);
      setDropOffAddress(null);
    } else if (fetchedWorkTracker) {
      console.log("fetchedWorkTracker", fetchedWorkTracker);
      setWorkTracker(fetchedWorkTracker.workTracker);
      setPayInput(
        fetchedWorkTracker.workTracker && fetchedWorkTracker.workTracker.pay_cents != null
          ? (fetchedWorkTracker.workTracker.pay_cents / 100).toFixed(2)
          : "",
      );
      setPickUpAddress({
        addressUuid: fetchedWorkTracker.pickupAddress?.id ?? null,
        address: fetchedWorkTracker.pickupAddress?.street ?? "",
        city: fetchedWorkTracker.pickupAddress?.city ?? "",
        state: fetchedWorkTracker.pickupAddress?.state_province ?? "",
        postalCode: fetchedWorkTracker.pickupAddress?.zip_postal ?? "",
      });
      setDropOffAddress({
        addressUuid: fetchedWorkTracker.dropoffAddress?.id ?? null,
        address: fetchedWorkTracker.dropoffAddress?.street ?? "",
        city: fetchedWorkTracker.dropoffAddress?.city ?? "",
        state: fetchedWorkTracker.dropoffAddress?.state_province ?? "",
        postalCode: fetchedWorkTracker.dropoffAddress?.zip_postal ?? "",
      });
    }
  }, [selectedWorkTracker, fetchedWorkTracker]);

  const handleSaveWorkTracker = async () => {
    try {
      await saveWorkTracker(workTracker, pickUpAddress, dropOffAddress, supabase);
      // Refresh bleachers directly into the zustand store so Pixi updates without remounting
      try {
        const { FetchDashboardBleachers } =
          await import("@/features/dashboard/db/client/bleachers");
        await FetchDashboardBleachers(supabase);
      } catch {}
      // Optionally refresh any active work-tracker-specific queries used elsewhere
      await queryClient.invalidateQueries({ queryKey: ["work-trackers"], refetchType: "active" });
      setSelectedWorkTracker(null);
      setSelectedBlock(null);
    } catch (error) {
      createErrorToast(["Failed to Save Work Tracker:", String(error)]);
    }
  };

  const handleDeleteWorkTracker = async () => {
    if (!workTracker?.id || workTracker.id === "-1") {
      createErrorToast(["Cannot delete unsaved work tracker"]);
      return;
    }

    if (!confirm("Are you sure you want to delete this work tracker?")) {
      return;
    }

    try {
      await deleteWorkTracker(workTracker.id, supabase);
      // Refresh bleachers directly into the zustand store so Pixi updates without remounting
      try {
        const { FetchDashboardBleachers } =
          await import("@/features/dashboard/db/client/bleachers");
        await FetchDashboardBleachers(supabase);
      } catch {}
      // Optionally refresh any active work-tracker-specific queries used elsewhere
      await queryClient.invalidateQueries({ queryKey: ["work-trackers"], refetchType: "active" });
      setSelectedWorkTracker(null);
      setSelectedBlock(null);
    } catch (error) {
      createErrorToast(["Failed to Delete Work Tracker:", String(error)]);
    }
  };

  function handlePayChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;

    // Allow empty input for backspacing
    if (raw === "") {
      setPayInput("");
      setWorkTracker((prev) => ({ ...prev!, pay_cents: null }));
      return;
    }

    // Only allow numbers with max 2 decimals
    const validFormat = /^\d*\.?\d{0,2}$/;
    if (!validFormat.test(raw)) return;

    setPayInput(raw);

    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      setWorkTracker((prev) => ({
        ...prev!,
        pay_cents: Math.round(parsed * 100),
      }));
    }
  }

  const handleCalculatePay = () => {
    if (!driverPaymentData) {
      createErrorToast(["Cannot calculate pay: Driver payment data not loaded"]);
      return;
    }

    if (!leg) {
      createErrorToast(["Cannot calculate pay: Distance/duration data not available"]);
      return;
    }

    const amount = calculateDriverPay(driverPaymentData, leg);

    if (amount === null || amount === 0) {
      createErrorToast(["Cannot calculate pay: Missing distance or duration data"]);
      return;
    }

    // Update the pay input field
    const formattedAmount = amount.toFixed(2);
    setPayInput(formattedAmount);
    setWorkTracker((prev) => ({
      ...prev!,
      pay_cents: Math.round(amount * 100),
    }));
  };

  const labelClassName = "block text-sm font-medium text-gray-700 mt-1";
  const inputClassName = "w-full p-2 border rounded bg-white";

  // Track whether the initial mousedown began on the backdrop so we only close when both down & up occur there
  const mouseDownOnBackdrop = useRef(false);

  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    mouseDownOnBackdrop.current = e.target === e.currentTarget; // only true if directly on backdrop
  };

  const handleBackdropMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mouseDownOnBackdrop.current && e.target === e.currentTarget) {
      setSelectedWorkTracker(null);
    }
    mouseDownOnBackdrop.current = false;
  };

  if (isWorkTrackerLoading)
    return (
      <div
        onMouseDown={() => setSelectedWorkTracker(null)}
        className="fixed inset-0 z-[2000] bg-black/0 backdrop-blur-xs flex items-center justify-center"
      >
        <LoadingSpinner />
      </div>
    );
  return (
    <>
      {selectedWorkTracker !== null && (
        <div
          onMouseDown={handleBackdropMouseDown}
          onMouseUp={handleBackdropMouseUp}
          className="fixed inset-0 z-[2000] bg-black/30 backdrop-blur-xs flex items-center justify-center"
        >
          <div
            onMouseDown={(e) => e.stopPropagation()} // 👈 prevent bubbling here
            className=" p-4 rounded shadow w-[900px] transition-colors duration-200 bg-white"
          >
            <div className="flex flex-row justify-between items-start">
              <h2 className="text-sm font-semibold mb-2">
                {selectedWorkTracker.id === "-1" ? "Create Work Tracker" : "Edit Work Tracker"}
              </h2>
              <X
                className="-mt-1 cursor-pointer text-black/30 hover:text-black hover:drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)] transition-all duration-200"
                onClick={() => setSelectedWorkTracker(null)}
              />
            </div>
            <div className="flex flex-row gap-4">
              {/* Column 1: Global Info */}
              <div className="flex-1">
                <div className="flex flex-row gap-2">
                  <div className="flex-[2]">
                    <label className={labelClassName}>Driver</label>
                    <Dropdown
                      options={(drivers ?? []).map((driver) => ({
                        label: (driver.first_name || "") + " " + (driver.last_name || ""),
                        value: driver.driver_uuid,
                      }))}
                      selected={workTracker?.driver_uuid}
                      onSelect={(id) =>
                        setWorkTracker((prev) => ({
                          ...prev!,
                          driver_uuid: id,
                        }))
                      }
                      placeholder={isDriversLoading ? "Loading..." : "Select Driver"}
                    />
                    {!isAdmin && (
                      <p className="text-xs text-gray-500 mt-1">
                        You're only seeing drivers assigned to you. You need to be an Admin to see
                        all Drivers.
                      </p>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className={labelClassName}>Bleacher</label>
                    <Dropdown
                      options={(bleacherOptions ?? []).map((bleacher) => ({
                        label: bleacher.label,
                        value: bleacher.uuid,
                      }))}
                      selected={workTracker?.bleacher_uuid}
                      onSelect={(id) =>
                        setWorkTracker((prev) => ({
                          ...prev!,
                          bleacher_uuid: id,
                        }))
                      }
                      placeholder={isBleachersLoading ? "Loading..." : "Select Bleacher"}
                    />
                  </div>
                </div>
                <label className={labelClassName}>Date</label>
                <input
                  type="date"
                  className={inputClassName}
                  value={workTracker?.date ?? ""}
                  onChange={(e) =>
                    setWorkTracker((prev) => ({
                      ...prev!,
                      date: e.target.value,
                    }))
                  }
                />
                {/* Status Badge - Account Manager can toggle between draft and released */}
                <label className={labelClassName}>Status</label>
                <div className="flex items-center justify-center p-3 bg-gray-50 rounded border">
                  <WorkTrackerStatusBadge
                    status={workTracker?.status ?? "draft"}
                    onStatusChange={(newStatus) => {
                      setWorkTracker((prev) => ({
                        ...prev!,
                        status: newStatus,
                      }));
                    }}
                    canEdit={true}
                  />
                </div>
                <label className={labelClassName}>Driver Notes</label>
                <textarea
                  className="w-full text-sm border p-1 rounded bg-white"
                  value={workTracker?.notes ?? ""}
                  placeholder="Driver Notes"
                  onChange={(e) =>
                    setWorkTracker((prev) => ({
                      ...prev!,
                      notes: e.target.value,
                    }))
                  }
                  rows={4}
                />
                <label className={labelClassName}>Internal Notes</label>
                <textarea
                  className="w-full text-sm border p-1 rounded bg-white"
                  value={workTracker?.internal_notes ?? ""}
                  placeholder="Internal Notes"
                  onChange={(e) =>
                    setWorkTracker((prev) => ({
                      ...prev!,
                      internal_notes: e.target.value,
                    }))
                  }
                  rows={4}
                />
                <label className={labelClassName}>Pay</label>
                <div className="flex flex-row gap-2 items-center">
                  <input
                    type="number"
                    className={inputClassName}
                    step="0.01"
                    min="0"
                    value={payInput}
                    onChange={handlePayChange}
                    placeholder="0.00"
                  />
                  <Calculator
                    className="h-5 w-5 hover:h-6 hover:w-6 transition-all cursor-pointer text-darkBlue hover:text-lightBlue"
                    onClick={handleCalculatePay}
                  />
                </div>
              </div>

              {/* Columns 2 & 3: Pickup and Dropoff with Map below */}
              <div className="flex-[2] flex flex-col gap-4">
                <div className="flex flex-row gap-4">
                  {/* Column 2: Pickup */}
                  <div className="flex-1">
                    <label className={labelClassName}>Pickup Time</label>
                    <input
                      type="text"
                      className={inputClassName}
                      placeholder="Pickup Time"
                      value={workTracker?.pickup_time ?? ""}
                      onChange={(e) =>
                        setWorkTracker((prev) => ({
                          ...prev!,
                          pickup_time: e.target.value,
                        }))
                      }
                    />
                    <label className={labelClassName}>Pickup POC</label>
                    <input
                      type="text"
                      className={inputClassName}
                      placeholder="Pickup POC"
                      value={workTracker?.pickup_poc ?? ""}
                      onChange={(e) =>
                        setWorkTracker((prev) => ({
                          ...prev!,
                          pickup_poc: e.target.value,
                        }))
                      }
                    />
                    <label className={labelClassName}>Pickup Address</label>
                    <div className="flex flex-row gap-2 items-center">
                      <AddressAutocomplete
                        className="bg-white"
                        onAddressSelect={(data) =>
                          setPickUpAddress({
                            ...data,
                            addressUuid: pickUpAddress?.addressUuid ?? null,
                          })
                        }
                        initialValue={pickUpAddress?.address || ""}
                      />
                      <Link className="h-5 w-5 hover:h-6 hover:w-6 transition-all cursor-pointer" />
                    </div>
                  </div>
                  {/* Column 3: Dropoff */}
                  <div className="flex-1">
                    <label className={labelClassName}>Dropoff Time</label>
                    <input
                      type="text"
                      className={inputClassName}
                      placeholder="Dropoff Time"
                      value={workTracker?.dropoff_time ?? ""}
                      onChange={(e) =>
                        setWorkTracker((prev) => ({
                          ...prev!,
                          dropoff_time: e.target.value,
                        }))
                      }
                    />
                    <label className={labelClassName}>Dropoff POC</label>
                    <input
                      type="text"
                      className={inputClassName}
                      placeholder="Dropoff POC"
                      value={workTracker?.dropoff_poc ?? ""}
                      onChange={(e) =>
                        setWorkTracker((prev) => ({
                          ...prev!,
                          dropoff_poc: e.target.value,
                        }))
                      }
                    />
                    <label className={labelClassName}>Dropoff Address</label>
                    <AddressAutocomplete
                      className="bg-white"
                      onAddressSelect={(data) =>
                        setDropOffAddress({
                          ...data,
                          addressUuid: dropOffAddress?.addressUuid ?? null,
                        })
                      }
                      initialValue={dropOffAddress?.address || ""}
                    />
                  </div>
                </div>

                {/* Distance & ETA Info - Below both Pickup and Dropoff columns */}
                <div className="mt-2">
                  <RouteMapPreview
                    origin={origin}
                    destination={dest}
                    pickUpAddress={pickUpAddress}
                    dropOffAddress={dropOffAddress}
                    isLoading={isLegFetching}
                    error={legErr}
                    distanceData={leg ?? null}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center gap-2">
              {workTracker?.id && workTracker.id !== "-1" && (
                <button
                  className="text-sm px-3 py-1 rounded bg-red-600 text-white cursor-pointer hover:bg-red-700 transition-all duration-200 flex items-center gap-1"
                  onClick={handleDeleteWorkTracker}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
              <div className="flex-1" />
              <button
                className="text-sm px-3 py-1 rounded bg-darkBlue text-white cursor-pointer hover:bg-lightBlue transition-all duration-200"
                onClick={handleSaveWorkTracker}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
