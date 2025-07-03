"use client";

import { useAuth } from "@clerk/nextjs";
import { getAddressFromId, saveSetupTeardownBlock } from "../../db";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { confirmedHsl, setupTeardownHsl } from "@/types/Constants";
import { Dropdown } from "@/components/DropDown";
import { getDrivers } from "../../db/getDrivers";
import { getDefaultDate } from "../../db/setupTeardownBlock/getDefaultDate";
import { AddressData } from "../../useCurrentEventStore";
import { Tables } from "../../../../../../../database.types";
import AddressAutocomplete from "@/app/(dashboards)/_lib/_components/AddressAutoComplete";
import { useQuery } from "@tanstack/react-query";
import { fetchWorkTracker } from "../../db/setupTeardownBlock/fetchWorkTracker";

export type SetupTeardownBlock = {
  bleacherEventId: number;
  bleacherId: number;
  text: string;
  confirmed: boolean;
  type: "setup" | "teardown";
  // workTracker: Tables<"WorkTrackers"> | null;
};

// export type WorkTracker = {
//   driverId: number | null;
//   date: string | null;
//   pickUpTime: string | null;
//   pickUpAddress: AddressData | null;
//   picupPOC: string | null;
//   dropOffTime: string | null;
//   dropOffAddress: AddressData | null;
//   dropOffPOC: string | null;
//   notes: string | null;
//   pay: number | null;
// };

type SetupTeardownBlockModalProps = {
  selectedBlock: SetupTeardownBlock | null;
  setSelectedBlock: (block: SetupTeardownBlock | null) => void;
};

export default function SetupBlockModal({
  selectedBlock,
  setSelectedBlock,
}: SetupTeardownBlockModalProps) {
  const { getToken } = useAuth();
  const drivers = getDrivers();

  const { data, isLoading, error } = useQuery({
    queryKey: ["work-tracker", selectedBlock?.bleacherEventId, selectedBlock?.type],
    queryFn: async () => {
      const token = await getToken({ template: "supabase" });
      return fetchWorkTracker(token!, selectedBlock!.bleacherEventId, selectedBlock!.type);
    },
    enabled: !!selectedBlock?.bleacherEventId, // Only run if ID exists
  });

  const [workTracker, setWorkTracker] = useState<Tables<"WorkTrackers"> | null>(null);
  const [pickUpAddress, setPickUpAddress] = useState<AddressData | null>(null);
  const [dropOffAddress, setDropOffAddress] = useState<AddressData | null>(null);

  useEffect(() => {
    if (selectedBlock) {
      setWorkTracker(selectedBlock.workTracker);
      const pickupAddress = getAddressFromId(selectedBlock.workTracker?.pickup_address_id ?? null);
      const dropoffAddress = getAddressFromId(
        selectedBlock.workTracker?.dropoff_address_id ?? null
      );
      setPickUpAddress(pickupAddress);
      setDropOffAddress(dropoffAddress);
    } else {
      setWorkTracker(null);
      setPickUpAddress(null);
      setDropOffAddress(null);
    }
  }, [selectedBlock]);

  useEffect(() => {
    console.log("workTracker:", workTracker);
  }, [workTracker]);

  const labelClassName = "block text-sm font-medium text-gray-700 mt-1";
  const inputClassName = "w-full p-2 border rounded bg-white";
  const handleSaveBlock = async () => {
    const token = await getToken({ template: "supabase" });
    try {
      await saveSetupTeardownBlock(
        selectedBlock,
        workTracker,
        pickUpAddress,
        dropOffAddress,
        token
      );
      setSelectedBlock(null);
    } catch (error) {
      console.error("Failed to Save Block:", error);
    }
  };
  useEffect(() => {
    console.log("Selected Block:", selectedBlock);
    // if (selectedBlock) {
    //   defaultDate = getDefaultDate(selectedBlock);
    // }
  }, [selectedBlock]);

  if (!selectedBlock) return null;
  return (
    <>
      {selectedBlock && (
        <div
          onMouseDown={() => setSelectedBlock(null)}
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center"
        >
          <div
            onMouseDown={(e) => e.stopPropagation()} // 👈 prevent bubbling here
            className=" p-4 rounded shadow w-[900px] transition-colors duration-200"
            style={{
              backgroundColor: selectedBlock.confirmed ? confirmedHsl : setupTeardownHsl,
            }}
          >
            <div className="flex flex-row justify-between items-start">
              <h2 className="text-sm font-semibold mb-2">
                Edit {selectedBlock.type.charAt(0).toUpperCase() + selectedBlock.type.slice(1)}
              </h2>
              <X
                className="-mt-1 cursor-pointer text-black/30 hover:text-black hover:drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)] transition-all duration-200"
                onClick={() => setSelectedBlock(null)}
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
                <label className={labelClassName}>Internal Notes</label>
                <textarea
                  className="w-full text-sm border p-1 rounded bg-white"
                  value={selectedBlock.text}
                  placeholder="Internal Notes"
                  onChange={(e) => setSelectedBlock({ ...selectedBlock, text: e.target.value })}
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
              <p className="text-xs">Confirmed?</p>
              <div className="flex flex-col">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    onChange={(e) =>
                      setSelectedBlock({ ...selectedBlock, confirmed: e.target.checked })
                    }
                    checked={selectedBlock.confirmed}
                  />
                  <div className="w-11 h-6 bg-black/30 peer-focus:outline-none peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-darkBlue"></div>
                </label>
              </div>
              <button
                className="text-sm px-3 py-1 rounded bg-darkBlue text-white cursor-pointer hover:bg-lightBlue transition-all duration-200"
                onClick={handleSaveBlock}
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
