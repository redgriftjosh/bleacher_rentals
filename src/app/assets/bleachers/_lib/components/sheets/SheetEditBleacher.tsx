"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchTakenBleacherNumbers,
  insertBleacher,
  updateBleacher,
  useBleacherQuery,
} from "../../db";
import SelectRowsDropDown from "../dropdowns/selectRowsDropDown";
import SelectHomeBaseDropDown from "../dropdowns/selectHomeBaseDropDown";
import SelectLinxupDeviceDropDown from "../dropdowns/selectLinxupDeviceDropDown";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";
import { SelectHomeBase } from "@/types/tables/HomeBases";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, CircleAlert, LoaderCircle } from "lucide-react";
import { checkInsertBleacherFormRules } from "../../functions";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { SelectAccountManager } from "@/features/manageTeam/components/inputs/SelectAccountManager";

// https://www.loom.com/share/377b110fd24f4eebbc6e90394ac3a407?sid=c32cff10-c666-4386-9a09-85ed203e4cb5
// Did a little explainer on how this works.

export function SheetEditBleacher() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useClerkSupabaseClient();
  const queryClient = useQueryClient();
  const searchParamsValue = searchParams.get("edit");
  const editBleacherNumber = searchParamsValue ? Number(searchParamsValue) : null;

  const [bleacherNumber, setBleacherNumber] = useState<number | null>(null);
  const [id, setId] = useState<number | null>(null);
  const [rows, setRows] = useState<number | null>(null);
  const [seats, setSeats] = useState<number | null>(null);
  const [selectedHomeBaseId, setSelectedHomeBaseId] = useState<number | null>(null);
  const [selectedWinterHomeBaseId, setSelectedWinterHomeBaseId] = useState<number | null>(null);
  const [selectedLinxupDeviceId, setSelectedLinxupDeviceId] = useState<string | null>(null);
  const [summerAccountManagerId, setSummerAccountManagerId] = useState<number | null>(null);
  const [winterAccountManagerId, setWinterAccountManagerId] = useState<number | null>(null);

  const [isTakenNumber, setIsTakenNumber] = useState(true);

  // Fetch the bleacher data using React Query
  const {
    data: bleacher,
    isLoading: bleacherLoading,
    error: bleacherError,
  } = useBleacherQuery(editBleacherNumber);

  // Fetch home bases for the dropdowns
  const { data: homeBases = [], isLoading: homeBasesLoading } = useQuery({
    queryKey: ["home-bases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("HomeBases")
        .select("home_base_id, home_base_name")
        .order("home_base_name");

      if (error) throw error;
      return data as SelectHomeBase[];
    },
    enabled: !!supabase,
  });

  // Populate form fields when bleacher data loads
  useEffect(() => {
    if (bleacher) {
      setBleacherNumber(bleacher.bleacher_number);
      setId(bleacher.bleacher_id);
      setRows(bleacher.bleacher_rows);
      setSeats(bleacher.bleacher_seats);
      setSelectedHomeBaseId(bleacher.home_base_id);
      setSelectedWinterHomeBaseId(bleacher.winter_home_base_id);
      setSelectedLinxupDeviceId(bleacher.linxup_device_id ?? null);
      setSummerAccountManagerId(bleacher.summer_account_manager_id ?? null);
      setWinterAccountManagerId(bleacher.winter_account_manager_id ?? null);
    } else if (bleacherError) {
      toast.error("Bleacher not found");
    }
  }, [bleacher, bleacherError]);

  // Reset form when sheet closes
  useEffect(() => {
    if (!editBleacherNumber) {
      setBleacherNumber(null);
      setId(null);
      setRows(null);
      setSeats(null);
      setSelectedHomeBaseId(null);
      setSelectedWinterHomeBaseId(null);
      setSelectedLinxupDeviceId(null);
      setSummerAccountManagerId(null);
      setWinterAccountManagerId(null);
    }
  }, [editBleacherNumber]);

  const { data: takenNumbers = [], isLoading } = useQuery({
    queryKey: ["taken-bleacher-numbers", editBleacherNumber],
    queryFn: () => {
      // console.log("Running query with editBleacherNumber:", editBleacherNumber);
      return fetchTakenBleacherNumbers(
        supabase,
        editBleacherNumber ? Number(editBleacherNumber) : undefined
      );
    },
    enabled: !!supabase && !!editBleacherNumber,
  });

  useEffect(() => {
    if (bleacherNumber) {
      setIsTakenNumber(takenNumbers.includes(bleacherNumber));
    }
  }, [bleacherNumber, takenNumbers]);

  const handleSave = async () => {
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
      await updateBleacher(
        {
          bleacher_id: id!,
          bleacher_number: bleacherNumber!,
          bleacher_rows: rows!,
          bleacher_seats: seats!,
          home_base_id: selectedHomeBaseId!,
          winter_home_base_id: selectedWinterHomeBaseId!,
          linxup_device_id: selectedLinxupDeviceId,
          summer_account_manager_id: summerAccountManagerId,
          winter_account_manager_id: winterAccountManagerId,
        },
        supabase,
        queryClient
      );
      //   setIsOpen(false);
      router.push("/assets/bleachers");
    }
  };

  //   if (!bleachersLoaded) return <LoadingSpinner />;

  return (
    <>
      {editBleacherNumber && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => router.push("/assets/bleachers")}
          />

          {/* Sheet */}
          <div className="fixed inset-y-0 right-0 w-full sm:max-w-sm bg-white shadow-xl flex flex-col animate-in slide-in-from-right">
            {/* Header */}
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Update a Bleacher</h2>
              <p className="text-sm text-gray-500">
                Fill out the form and click 'Save Changes' to lock in your changes bleacher.
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
                <div className="grid grid-cols-5 items-center gap-4">
                  <label htmlFor="name" className="text-right text-sm font-medium col-span-2">
                    Summer Account Manager
                  </label>
                  <div className="col-span-3">
                    <SelectAccountManager
                      value={summerAccountManagerId}
                      onChange={(value) => setSummerAccountManagerId(value)}
                      placeholder="Select Account Manager..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-5 items-center gap-4">
                  <label htmlFor="name" className="text-right text-sm font-medium col-span-2">
                    Winter Account Manager
                  </label>
                  <div className="col-span-3">
                    <SelectAccountManager
                      value={winterAccountManagerId}
                      onChange={(value) => setWinterAccountManagerId(value)}
                      placeholder="Select Account Manager..."
                    />
                  </div>
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
