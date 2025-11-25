"use client";
import { useEffect, useState } from "react";
import SelectRowsDropDown from "../dropdowns/selectRowsDropDown";
import { useHomeBasesStore } from "@/state/homeBaseStore";
import SelectHomeBaseDropDown from "../dropdowns/selectHomeBaseDropDown";
import SelectLinxupDeviceDropDown from "../dropdowns/selectLinxupDeviceDropDown";
import { fetchTakenBleacherNumbers, insertBleacher } from "../../db";
import { SelectHomeBase } from "@/types/tables/HomeBases";
import { checkInsertBleacherFormRules } from "../../functions";
import { useQuery } from "@tanstack/react-query";
import { CheckCheck, CircleAlert, LoaderCircle } from "lucide-react";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";

export function SheetAddBleacher() {
  const [token, setToken] = useState<string | null>(null);
  const homeBases = useHomeBasesStore((s) => s.homeBases) as SelectHomeBase[];
  const supabase = useClerkSupabaseClient();

  const [isOpen, setIsOpen] = useState(false);
  const [bleacherNumber, setBleacherNumber] = useState<number | null>(null);
  const [rows, setRows] = useState<number | null>(null);
  const [seats, setSeats] = useState<number | null>(null);
  // const [homeBases, setHomeBases] = useState<HomeBase[] | null>(null);
  const [selectedHomeBaseId, setSelectedHomeBaseId] = useState<number | null>(null);
  const [selectedWinterHomeBaseId, setSelectedWinterHomeBaseId] = useState<number | null>(null);
  const [selectedLinxupDeviceId, setSelectedLinxupDeviceId] = useState<string | null>(null);
  const [isTakenNumber, setIsTakenNumber] = useState(true);
  // const [isLoading, setIsLoading] = useState(true);

  // useEffect to set all back to default
  useEffect(() => {
    if (!isOpen) {
      setBleacherNumber(null);
      setRows(null);
      setSeats(null);
      setSelectedHomeBaseId(null);
      setSelectedWinterHomeBaseId(null);
      setSelectedLinxupDeviceId(null);
    }
  }, [isOpen]);

  const { data: takenNumbers = [], isLoading } = useQuery({
    queryKey: ["taken-bleacher-numbers"],
    queryFn: () => fetchTakenBleacherNumbers(supabase),
    enabled: !!supabase,
  });

  // Calculate the next available bleacher number
  useEffect(() => {
    if (!isLoading && takenNumbers.length > 0 && !bleacherNumber) {
      const highestNumber = Math.max(...takenNumbers);
      setBleacherNumber(highestNumber + 1);
    }
  }, [takenNumbers, isLoading, bleacherNumber]);

  useEffect(() => {
    if (bleacherNumber) {
      setIsTakenNumber(takenNumbers.includes(bleacherNumber));
    }
  }, [bleacherNumber, takenNumbers]);

  const handleSave = async () => {
    if (!supabase) {
      console.warn("No supabase client found");
      return;
    }

    if (
      !checkInsertBleacherFormRules(
        {
          bleacher_number: bleacherNumber,
          bleacher_rows: rows,
          bleacher_seats: seats,
          home_base_id: selectedHomeBaseId,
          winter_home_base_id: selectedWinterHomeBaseId,
        },
        takenNumbers
      )
    ) {
      throw new Error("Event form validation failed");
    } else {
      await insertBleacher(
        {
          bleacher_number: bleacherNumber!,
          bleacher_rows: rows!,
          bleacher_seats: seats!,
          home_base_id: selectedHomeBaseId!,
          winter_home_base_id: selectedWinterHomeBaseId!,
          linxup_device_id: selectedLinxupDeviceId,
        },
        supabase
      );
      setIsOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-darkBlue text-white text-sm font-semibold rounded-lg shadow-md hover:bg-lightBlue transition cursor-pointer"
      >
        + Add Bleacher
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Sheet */}
          <div className="fixed inset-y-0 right-0 w-full sm:max-w-sm bg-white shadow-xl flex flex-col animate-in slide-in-from-right">
            {/* Header */}
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Add A New Bleacher</h2>
              <p className="text-sm text-gray-500">
                Fill out the form and click 'Save Changes' to create a new bleacher.
              </p>
            </div>

            {/* Content */}
            <div className="flex-1 p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-5 items-center gap-4">
                  <label htmlFor="name" className="text-right text-sm font-medium col-span-2">
                    Bleacher Number
                  </label>
                  <div className="col-span-2">
                    <div className="relative">
                      <input
                        id="name"
                        type="number"
                        value={bleacherNumber ?? ""}
                        onChange={(e) => setBleacherNumber(Number(e.target.value))}
                        className={`w-full px-3 py-2 border rounded-md text-sm font-medium ${
                          isTakenNumber
                            ? "border-red-700 focus:ring-red-700"
                            : "text-gray-700 focus:ring-greenAccent focus:border-0"
                        } focus:outline-none focus:ring-2`}
                      />
                      <div className="absolute -right-10 top-1/2 transform -translate-y-1/2">
                        {isTakenNumber ? (
                          <CircleAlert className="text-red-700" />
                        ) : isLoading ? (
                          <LoaderCircle className="text-blue-700 animate-spin" />
                        ) : (
                          <CheckCheck className="text-green-700" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-5 items-center gap-4">
                  <label htmlFor="name" className="text-right text-sm font-medium col-span-2">
                    Seats
                  </label>
                  <input
                    id="name"
                    type="number"
                    value={seats ?? ""}
                    onChange={(e) => setSeats(Number(e.target.value))}
                    className="col-span-3 px-3 py-2 border rounded-md text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0"
                  />
                </div>
                <div className="grid grid-cols-5 items-center gap-4">
                  <label htmlFor="name" className="text-right text-sm font-medium col-span-2">
                    Rows
                  </label>
                  <SelectRowsDropDown
                    onSelect={(e) => setRows(Number(e))}
                    value={rows ?? undefined}
                  />
                </div>
                <div className="grid grid-cols-5 items-center gap-4">
                  <label htmlFor="name" className="text-right text-sm font-medium col-span-2">
                    Home Base
                  </label>
                  <SelectHomeBaseDropDown
                    options={homeBases ?? []} // Add your home base options here
                    onSelect={(e) => setSelectedHomeBaseId(Number(e.home_base_id))}
                    placeholder="Select Home Base"
                    value={selectedHomeBaseId ?? undefined}
                  />
                </div>
                <div className="grid grid-cols-5 items-center gap-4">
                  <label htmlFor="name" className="text-right text-sm font-medium col-span-2">
                    Winter Home Base
                  </label>
                  <SelectHomeBaseDropDown
                    options={homeBases ?? []} // Add your home base options here
                    onSelect={(e) => setSelectedWinterHomeBaseId(Number(e.home_base_id))}
                    placeholder="Select Home Base"
                    value={selectedWinterHomeBaseId ?? undefined}
                  />
                </div>
                <div className="grid grid-cols-5 items-center gap-4">
                  <label htmlFor="name" className="text-right text-sm font-medium col-span-2">
                    Linxup Device
                  </label>
                  <SelectLinxupDeviceDropDown
                    onSelect={(deviceId) => setSelectedLinxupDeviceId(deviceId)}
                    placeholder="Select Device (Optional)"
                    value={selectedLinxupDeviceId ?? null}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t flex justify-end">
              <button
                type="submit"
                onClick={handleSave}
                className="px-4 py-2 bg-darkBlue text-white rounded-md hover:bg-lightBlue transition-colors cursor-pointer"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
