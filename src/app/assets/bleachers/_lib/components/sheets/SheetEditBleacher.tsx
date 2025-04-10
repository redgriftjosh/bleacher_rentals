"use client";
import { useEffect, useState } from "react";
import { useHomeBasesStore } from "@/state/homeBaseStore";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useBleachersStore } from "@/state/bleachersStore";
import { insertBleacher, updateBleacher } from "../../db";
import SelectRowsDropDown from "../dropdowns/selectRowsDropDown";
import SelectHomeBaseDropDown from "../dropdowns/selectHomeBaseDropDown";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";
import { SelectHomeBase } from "@/types/tables/HomeBases";

// https://www.loom.com/share/377b110fd24f4eebbc6e90394ac3a407?sid=c32cff10-c666-4386-9a09-85ed203e4cb5
// Did a little explainer on how this works.

export function SheetEditBleacher() {
  const { getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  //   const editBleacherNumber = searchParams.get("edit");
  const [editBleacherNumber, setEditBleacherNumber] = useState<string | null>(null);
  const homeBases = useHomeBasesStore((s) => s.homeBases) as SelectHomeBase[];
  const homeBasesLoading = useHomeBasesStore((s) => s.loading);
  const bleachers = useBleachersStore((s) => s.bleachers);
  const bleachersLoading = useBleachersStore((s) => s.loading);

  const [bleacherNumber, setBleacherNumber] = useState<number | null>(null);
  const [id, setId] = useState<number | null>(null);
  const [rows, setRows] = useState<number | null>(null);
  const [seats, setSeats] = useState<number | null>(null);
  const [selectedHomeBaseId, setSelectedHomeBaseId] = useState<number | null>(null);
  const [selectedWinterHomeBaseId, setSelectedWinterHomeBaseId] = useState<number | null>(null);

  // useEffect to set all back to default
  useEffect(() => {
    const edit = searchParams.get("edit");

    if (!edit) {
      setEditBleacherNumber(null);
      return;
    }
    console.log("editBleacherNumber:", edit);
    setEditBleacherNumber(edit);

    if (bleachersLoading || homeBasesLoading) return;
    console.log("bleachersss:", bleachers);
    const bleacher = bleachers.find((b) => b.bleacher_number === Number(edit));

    if (bleacher) {
      setBleacherNumber(bleacher.bleacher_number);
      setId(bleacher.bleacher_id);
      setRows(bleacher.bleacher_rows);
      setSeats(bleacher.bleacher_seats);
      setSelectedHomeBaseId(bleacher.home_base_id);
      setSelectedWinterHomeBaseId(bleacher.winter_home_base_id);
    } else {
      // setIsOpen(false);
      toast.error("Bleacher not found");
    }
  }, [searchParams, bleachers, bleachersLoading, homeBases, homeBasesLoading]);

  // useEffect to set all back to default and clear URL
  useEffect(() => {
    if (!editBleacherNumber) {
      setBleacherNumber(null);
      setRows(null);
      setSeats(null);
      setSelectedHomeBaseId(null);
      setSelectedWinterHomeBaseId(null);
      // Remove the edit parameter from URL
      //   router.push("/assets/bleachers");
    }
  }, [editBleacherNumber, router]);

  const handleSave = async () => {
    const token = await getToken({ template: "supabase" });
    if (!token) {
      console.warn("No token found");
      return;
    }
    if (bleacherNumber && rows && seats && selectedHomeBaseId && selectedWinterHomeBaseId && id) {
      await updateBleacher(
        {
          bleacher_id: id,
          bleacher_number: bleacherNumber,
          bleacher_rows: rows,
          bleacher_seats: seats,
          home_base_id: selectedHomeBaseId,
          winter_home_base_id: selectedWinterHomeBaseId,
        },
        token
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
              <h2 className="text-lg font-semibold">Updare a Bleacher</h2>
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
                  <input
                    id="name"
                    type="number"
                    value={bleacherNumber ?? ""}
                    onChange={(e) => setBleacherNumber(Number(e.target.value))}
                    className="col-span-3 px-3 py-2 border rounded-md text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0"
                  />
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
