import { Link, X } from "lucide-react";
import { Tables } from "../../../../../../../database.types";
import { Dropdown } from "@/components/DropDown";
import { getDrivers } from "../../db/getDrivers";
import { useEffect, useState } from "react";
import AddressAutocomplete from "@/app/(dashboards)/_lib/_components/AddressAutoComplete";
import { fetchAddressFromId, getAddressFromId, saveWorkTracker } from "../../db";
import { AddressData } from "../../useCurrentEventStore";
import { useAuth } from "@clerk/nextjs";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { useQuery } from "@tanstack/react-query";
import { fetchWorkTrackerById } from "../../db/setupTeardownBlock/fetchWorkTracker";
import { EditBlock } from "./MainScrollableGrid";
import LoadingSpinner from "@/components/LoadingSpinner";

type WorkTrackerModalProps = {
  selectedWorkTracker: Tables<"WorkTrackers"> | null;
  setSelectedWorkTracker: (block: Tables<"WorkTrackers"> | null) => void;
  setSelectedBlock: (block: EditBlock | null) => void;
};

export default function WorkTrackerModal({
  selectedWorkTracker,
  setSelectedWorkTracker,
  setSelectedBlock,
}: WorkTrackerModalProps) {
  const { getToken } = useAuth();
  const drivers = getDrivers();
  const [workTracker, setWorkTracker] = useState<Tables<"WorkTrackers"> | null>(
    selectedWorkTracker
  );
  const pickupAddress = getAddressFromId(selectedWorkTracker?.pickup_address_id ?? null);
  const dropoffAddress = getAddressFromId(selectedWorkTracker?.dropoff_address_id ?? null);
  const [pickUpAddress, setPickUpAddress] = useState<AddressData | null>(pickupAddress);
  const [dropOffAddress, setDropOffAddress] = useState<AddressData | null>(dropoffAddress);

  useEffect(() => {
    setWorkTracker(selectedWorkTracker);
  }, [selectedWorkTracker]);

  console.log("selectedWorkTracker WorkTrackerModal", selectedWorkTracker);

  const {
    data: fetchedWorkTracker,
    isLoading: isWorkTrackerLoading,
    isError: isWorkTrackerError,
  } = useQuery({
    queryKey: ["workTracker", selectedWorkTracker?.work_tracker_id],
    queryFn: async () => {
      const token = await getToken({ template: "supabase" });
      return fetchWorkTrackerById(selectedWorkTracker!.work_tracker_id, token);
    },
    enabled: !!selectedWorkTracker && selectedWorkTracker.work_tracker_id !== -1,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (selectedWorkTracker?.work_tracker_id === -1) {
      setWorkTracker(selectedWorkTracker);
      setPickUpAddress(null);
      setDropOffAddress(null);
    } else if (fetchedWorkTracker) {
      console.log("fetchedWorkTracker", fetchedWorkTracker);
      setWorkTracker(fetchedWorkTracker.workTracker);
      setPickUpAddress({
        addressId: fetchedWorkTracker.pickupAddress?.address_id ?? null,
        address: fetchedWorkTracker.pickupAddress?.street ?? "",
        city: fetchedWorkTracker.pickupAddress?.city ?? "",
        state: fetchedWorkTracker.pickupAddress?.state_province ?? "",
        postalCode: fetchedWorkTracker.pickupAddress?.zip_postal ?? "",
      });
      setDropOffAddress({
        addressId: fetchedWorkTracker.dropoffAddress?.address_id ?? null,
        address: fetchedWorkTracker.dropoffAddress?.street ?? "",
        city: fetchedWorkTracker.dropoffAddress?.city ?? "",
        state: fetchedWorkTracker.dropoffAddress?.state_province ?? "",
        postalCode: fetchedWorkTracker.dropoffAddress?.zip_postal ?? "",
      });
    }
  }, [selectedWorkTracker, fetchedWorkTracker]);

  const handleSaveWorkTracker = async () => {
    const token = await getToken({ template: "supabase" });
    try {
      await saveWorkTracker(workTracker, pickUpAddress, dropOffAddress, token);
      setSelectedWorkTracker(null);
      setSelectedBlock(null);
    } catch (error) {
      createErrorToast(["Failed to Save Work Tracker:", String(error)]);
    }
  };

  const labelClassName = "block text-sm font-medium text-gray-700 mt-1";
  const inputClassName = "w-full p-2 border rounded bg-white";

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
          onMouseDown={() => setSelectedWorkTracker(null)}
          className="fixed inset-0 z-[2000] bg-black/30 backdrop-blur-xs flex items-center justify-center"
        >
          <div
            onMouseDown={(e) => e.stopPropagation()} // 👈 prevent bubbling here
            className=" p-4 rounded shadow w-[900px] transition-colors duration-200 bg-white"
          >
            <div className="flex flex-row justify-between items-start">
              <h2 className="text-sm font-semibold mb-2">
                {selectedWorkTracker.work_tracker_id === -1
                  ? "Create Work Tracker"
                  : "Edit Work Tracker"}
              </h2>
              <X
                className="-mt-1 cursor-pointer text-black/30 hover:text-black hover:drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)] transition-all duration-200"
                onClick={() => setSelectedWorkTracker(null)}
              />
            </div>
            <div className="flex flex-row gap-4">
              {/* Column 1: Global Info */}
              <div className="flex-1">
                <label className={labelClassName}>Driver</label>
                <Dropdown
                  options={drivers.map((driver) => ({
                    label: driver.first_name + " " + driver.last_name,
                    value: driver.user_id,
                  }))}
                  selected={workTracker?.user_id}
                  onSelect={(id) =>
                    setWorkTracker((prev) => ({
                      ...prev!,
                      user_id: id,
                    }))
                  }
                  placeholder="Select Driver"
                />
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
              </div>
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
                        addressId: pickUpAddress?.addressId ?? null,
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
                      addressId: dropOffAddress?.addressId ?? null,
                    })
                  }
                  initialValue={dropOffAddress?.address || ""}
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end items-center gap-2">
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
