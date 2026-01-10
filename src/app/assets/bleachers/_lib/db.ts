"use client";
import { FormattedBleacher } from "./types";
import { InsertBleacher, UpdateBleacher } from "@/types/tables/Bleachers";
import { toast } from "sonner";
import React from "react";
import { ErrorToast } from "@/components/toasts/ErrorToast";
import { SuccessToast } from "@/components/toasts/SuccessToast";
import { updateDataBase } from "@/app/actions/db.actions";
import { SupabaseClient } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { Database } from "../../../../../database.types";

// Fetching the list of bleachers with home bases using React Query
export function useBleachersQuery() {
  const supabase = useClerkSupabaseClient();

  return useQuery({
    queryKey: ["bleachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Bleachers")
        .select(
          `
          bleacher_number,
          bleacher_rows,
          bleacher_seats,
          home_base:HomeBases!Bleachers_home_base_id_fkey(
            home_base_id,
            home_base_name
          ),
          winter_home_base:HomeBases!Bleachers_winter_home_base_id_fkey(
            home_base_id,
            home_base_name
          )
        `
        )
        .order("bleacher_number", { ascending: false });

      if (error) throw error;

      const formattedBleachers: FormattedBleacher[] = (data || []).map((bleacher) => {
        const homeBase = bleacher.home_base as any;
        const winterHomeBase = bleacher.winter_home_base as any;

        return {
          bleacherNumber: bleacher.bleacher_number,
          bleacherRows: bleacher.bleacher_rows,
          bleacherSeats: bleacher.bleacher_seats,
          homeBase: {
            homeBaseId: homeBase?.home_base_id ?? 0,
            homeBaseName: homeBase?.home_base_name ?? "",
          },
          winterHomeBase: {
            homeBaseId: winterHomeBase?.home_base_id ?? 0,
            homeBaseName: winterHomeBase?.home_base_name ?? "",
          },
        };
      });

      return formattedBleachers;
    },
  });
}

// Fetch a single bleacher with all details for editing
export function useBleacherQuery(bleacherNumber: number | null) {
  const supabase = useClerkSupabaseClient();

  return useQuery({
    queryKey: ["bleacher", bleacherNumber],
    queryFn: async () => {
      if (!bleacherNumber) return null;

      const { data, error } = await supabase
        .from("Bleachers")
        .select(
          `
          bleacher_id,
          bleacher_number,
          bleacher_rows,
          bleacher_seats,
          home_base_id,
          winter_home_base_id,
          linxup_device_id,
          summer_account_manager_uuid,
          winter_account_manager_uuid
        `
        )
        .eq("bleacher_number", bleacherNumber)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!supabase && bleacherNumber !== null,
  });
}

export async function insertBleacher(
  bleacher: InsertBleacher,
  supabase: SupabaseClient<Database>,
  queryClient?: any
) {
  // console.log("inserting bleacher", token);
  const { error } = await supabase.from("Bleachers").insert(bleacher);
  if (error) {
    // console.log("Error inserting bleacher:", error);
    let errorMessage = error.message;
    if (error.code === "23505") {
      // Check which constraint was violated
      if (error.message.includes("Bleachers_linxup_device_id_key")) {
        errorMessage = "Error: This Linxup device is already assigned to another bleacher!";
      } else {
        errorMessage = "Error: Bleacher number already exists!";
      }
    }
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: [
            "Error inserting bleacher. Please refresh your page and try again.",
            errorMessage,
          ],
        }),
      {
        duration: 10000, // 20 seconds
      }
    );
    throw new Error(`Failed to insert bleacher: ${error.message}`);
  }
  toast.custom(
    (t) =>
      React.createElement(SuccessToast, {
        id: t,
        lines: ["Bleacher was Created"],
      }),
    { duration: 10000 }
  );

  // Invalidate React Query caches if queryClient is provided
  if (queryClient) {
    await queryClient.invalidateQueries({ queryKey: ["bleachers"] });
    await queryClient.invalidateQueries({ queryKey: ["bleachers-with-assignments"] });
    await queryClient.invalidateQueries({ queryKey: ["taken-bleacher-numbers"] });
  }
}

export async function updateBleacher(
  bleacher: UpdateBleacher,
  supabase: SupabaseClient<Database>,
  queryClient?: any
) {
  // console.log("Updating bleacher", token);
  // const supabase = createClient(token);
  const { error } = await supabase
    .from("Bleachers")
    .update(bleacher)
    .eq("bleacher_id", bleacher.bleacher_id);

  if (error) {
    // console.log("Error inserting bleacher:", error);
    let errorMessage = error.message;
    if (error.code === "23505") {
      errorMessage = "Error: Bleacher number already exists!";
    }
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: ["Error Updating bleacher. Please refresh your page and try again.", errorMessage],
        }),
      {
        duration: 10000, // 20 seconds
      }
    );
    throw new Error(`Failed to update bleacher: ${error.message}`);
  }
  toast.custom(
    (t) =>
      React.createElement(SuccessToast, {
        id: t,
        lines: ["Bleacher was Updated"],
      }),
    { duration: 10000 }
  );

  // Invalidate React Query caches if queryClient is provided
  if (queryClient) {
    await queryClient.invalidateQueries({ queryKey: ["bleachers"] });
    await queryClient.invalidateQueries({ queryKey: ["bleachers-with-assignments"] });
    await queryClient.invalidateQueries({ queryKey: ["bleacher"] });
  }

  updateDataBase(["Bleachers"]);
}

/**
 * Fetch all taken bleacher numbers from the Supabase "Bleachers" table.
 * Requires a valid Supabase JWT token.
 */
export async function fetchTakenBleacherNumbers(
  supabase: SupabaseClient<Database>,
  editBleacherNumber?: number
): Promise<number[]> {
  const { data, error } = await supabase.from("Bleachers").select("bleacher_number");

  if (error) {
    console.error("Failed to fetch bleacher numbers:", error.message);
    throw new Error("Could not fetch bleacher numbers");
  }

  const numbers = data
    .map((row) => row.bleacher_number)
    .filter((n): n is number => typeof n === "number");

  // console.log("editBleacherNumber:", editBleacherNumber);
  // console.log("numbers:", numbers);

  // Filter out the editBleacherNumber if it exists
  return editBleacherNumber ? numbers.filter((num) => num !== editBleacherNumber) : numbers;
}
