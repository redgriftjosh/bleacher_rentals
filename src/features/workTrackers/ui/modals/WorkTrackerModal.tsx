import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EditBlock } from "../../../../app/(dashboards)/bleachers-dashboard/_lib/_components/dashboard/MainScrollableGrid";
import LoadingSpinner from "@/components/LoadingSpinner";
import LinkEventButton from "../inputs.ts/LinkEventButton";
import OverridablePOCInput from "../inputs.ts/OverridablePOCInput";
import AddressInput from "../inputs.ts/AddressInput";
import { WorkTracker, WorkTrackerEvent, WorkTrackerIsOpen } from "../../types";
import { fetchWorkTrackerById } from "../../db/fetchWorkTrackerById";
import { saveWorkTracker } from "../../db/saveWorkTracker";
import PayInput from "../inputs.ts/PayInput";
import { inputClassName, labelClassName, titleClassName } from "../../constants";
import { DriverDropdown } from "../inputs.ts/DriverDropDown";

type WorkTrackerModalProps = {
  selectedWorkTrackerIsOpen: WorkTrackerIsOpen | null;
  setSelectedWorkTrackerIsOpen: (block: WorkTrackerIsOpen | null) => void;
  setSelectedBlock: (block: EditBlock | null) => void;
};

export default function WorkTrackerModal({
  selectedWorkTrackerIsOpen,
  setSelectedWorkTrackerIsOpen,
  setSelectedBlock,
}: WorkTrackerModalProps) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  const [workTracker, setWorkTracker] = useState<WorkTracker | null>(null);

  const {
    data: fetchedWorkTracker,
    isLoading: isWorkTrackerLoading,
    isError: isWorkTrackerError,
  } = useQuery({
    queryKey: ["workTracker", selectedWorkTrackerIsOpen?.workTrackerId],
    queryFn: async () => {
      const token = await getToken({ template: "supabase" });
      return fetchWorkTrackerById(selectedWorkTrackerIsOpen!.workTrackerId, token);
    },
    enabled: !!(selectedWorkTrackerIsOpen && selectedWorkTrackerIsOpen.workTrackerId),
  });

  const saveMutation = useMutation({
    // what runs on Save
    mutationFn: async (wt: WorkTracker | null) => {
      const token = await getToken({ template: "supabase" });
      if (!token) throw new Error("Missing token");
      return saveWorkTracker(wt, token); // return the saved entity (with id)
    },

    // update caches + close modal
    onSuccess: (saved) => {
      // keep the single-item cache fresh
      if (saved != null) {
        qc.setQueryData(["workTracker", saved], saved);
      }
      // refresh any list/table screens
      qc.invalidateQueries({ queryKey: ["workTrackers"] });

      // close the modal (UI concern)
      setSelectedWorkTrackerIsOpen(null);
      setSelectedBlock(null);
    },

    onError: (err: unknown) => {
      createErrorToast(["Failed to save Work Tracker", String(err)]);
    },
  });

  useEffect(() => {
    if (selectedWorkTrackerIsOpen?.workTrackerId === null) {
      setWorkTracker(null);
    } else if (fetchedWorkTracker) {
      setWorkTracker(fetchedWorkTracker);
    }
  }, [selectedWorkTrackerIsOpen, fetchedWorkTracker]);

  const handleSaveWorkTracker = async () => {
    // const token = await getToken({ template: "supabase" });
    try {
      // await saveWorkTracker(workTracker, token);
      saveMutation.mutate(workTracker);
      setSelectedWorkTrackerIsOpen(null);
      setSelectedBlock(null);
    } catch (error) {
      createErrorToast(["Failed to Save Work Tracker:", String(error)]);
    }
  };

  useEffect(() => {
    console.log("workTracker", workTracker);
  }, [workTracker]);

  if (isWorkTrackerLoading)
    return (
      <div
        onMouseDown={() => setSelectedWorkTrackerIsOpen(null)}
        className="fixed inset-0 z-[2000] bg-black/0 backdrop-blur-xs flex items-center justify-center"
      >
        <LoadingSpinner />
      </div>
    );
  return (
    <>
      {selectedWorkTrackerIsOpen !== null && (
        <div
          onMouseDown={() => setSelectedWorkTrackerIsOpen(null)}
          className="fixed inset-0 z-[2000] bg-black/30 backdrop-blur-xs flex items-center justify-center"
        >
          <div
            onMouseDown={(e) => e.stopPropagation()} // 👈 prevent bubbling here
            className=" p-4 rounded shadow w-[900px] transition-colors duration-200 bg-white"
          >
            <div className="flex flex-row justify-between items-start">
              <h2 className="text-sm font-semibold mb-2">
                {workTracker?.workTrackerId === null ? "Create Work Tracker" : "Edit Work Tracker"}
              </h2>
              <X
                className="-mt-1 cursor-pointer text-black/30 hover:text-black hover:drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)] transition-all duration-200"
                onClick={() => setSelectedWorkTrackerIsOpen(null)}
              />
            </div>
            <div className="flex flex-row gap-4">
              {/* Column 1: Global Info */}
              <div className="flex-1">
                <label className={labelClassName}>Driver</label>
                {/* <Dropdown
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
                /> */}
                <DriverDropdown
                  selectedUserId={workTracker?.driver?.driverId ?? null}
                  onChange={(driver) =>
                    setWorkTracker((prev) => ({
                      ...prev!,
                      driver: driver,
                    }))
                  }
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
                <label className={labelClassName}>Pay</label>
                <PayInput
                  payCents={workTracker?.payCents ?? 0}
                  setPayCents={(cents) => setWorkTracker((prev) => ({ ...prev!, payCents: cents }))}
                />
              </div>
              {/* Column 2: Pickup */}
              <div className="flex-1 min-w-0">
                <label className={titleClassName}>Pick Up</label>
                <LinkEventButton
                  date={workTracker?.date ?? ""}
                  bleacherId={workTracker?.bleacherId ?? 0}
                  pickUpOrDropOff="pickup"
                  setSelectedEvent={(event: WorkTrackerEvent | null) => {
                    setWorkTracker((prev) => ({
                      ...prev!,
                      pickupEvent: event,
                      pickupPOCOverride: false,
                    }));
                  }}
                  selectedEvent={workTracker?.pickupEvent ?? null}
                />
                <label className={labelClassName}> Time</label>
                <input
                  type="text"
                  className={inputClassName}
                  placeholder="Pickup Time"
                  value={workTracker?.pickupTime ?? ""}
                  onChange={(e) =>
                    setWorkTracker((prev) => ({
                      ...prev!,
                      pickupTime: e.target.value,
                    }))
                  }
                />
                <label className={labelClassName}>Point of Contact</label>
                <OverridablePOCInput
                  event={workTracker?.pickupEvent ?? null}
                  override={workTracker?.pickupPOCOverride ?? false}
                  poc={workTracker?.pickupPOC ?? null}
                  setOverride={(override) =>
                    setWorkTracker((prev) => ({
                      ...prev!,
                      pickupPOCOverride: override,
                    }))
                  }
                  setPoc={(poc) =>
                    setWorkTracker((prev) => ({
                      ...prev!,
                      pickupPOC: poc,
                    }))
                  }
                />
                <label className={labelClassName}> Address</label>
                <AddressInput
                  event={workTracker?.pickupEvent ?? null}
                  address={workTracker?.pickupAddress ?? null}
                  setAddress={(address) =>
                    setWorkTracker((prev) => ({
                      ...prev!,
                      pickupAddress: address,
                    }))
                  }
                />
              </div>
              {/* Column 3: Dropoff */}
              <div className="flex-1 min-w-0">
                <label className={titleClassName}>Drop Off</label>
                <LinkEventButton
                  date={workTracker?.date ?? ""}
                  bleacherId={workTracker?.bleacherId ?? 0}
                  pickUpOrDropOff="dropoff"
                  setSelectedEvent={(event: WorkTrackerEvent | null) => {
                    setWorkTracker((prev) => ({
                      ...prev!,
                      dropoffEvent: event,
                      dropoffPOCOverride: false,
                    }));
                  }}
                  selectedEvent={workTracker?.dropoffEvent ?? null}
                />
                <label className={labelClassName}>Time</label>
                <input
                  type="text"
                  className={inputClassName}
                  placeholder="Dropoff Time"
                  value={workTracker?.dropoffTime ?? ""}
                  onChange={(e) =>
                    setWorkTracker((prev) => ({
                      ...prev!,
                      dropoffTime: e.target.value,
                    }))
                  }
                />
                <label className={labelClassName}>Point of Contact</label>
                <OverridablePOCInput
                  event={workTracker?.dropoffEvent ?? null}
                  override={workTracker?.dropoffPOCOverride ?? false}
                  poc={workTracker?.dropoffPOC ?? null}
                  setOverride={(override) =>
                    setWorkTracker((prev) => ({
                      ...prev!,
                      dropoffPOCOverride: override,
                    }))
                  }
                  setPoc={(poc) =>
                    setWorkTracker((prev) => ({
                      ...prev!,
                      dropoffPOC: poc,
                    }))
                  }
                />

                <label className={labelClassName}> Address</label>
                <AddressInput
                  event={workTracker?.dropoffEvent ?? null}
                  address={workTracker?.dropoffAddress ?? null}
                  setAddress={(address) =>
                    setWorkTracker((prev) => ({
                      ...prev!,
                      dropoffAddress: address,
                    }))
                  }
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end items-center gap-2">
              <button
                className="text-sm px-3 py-1 rounded bg-darkBlue text-white cursor-pointer hover:bg-lightBlue transition-all duration-200 disabled:opacity-60"
                onClick={handleSaveWorkTracker}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
