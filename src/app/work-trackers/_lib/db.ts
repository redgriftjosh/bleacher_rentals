import { createErrorToast } from "@/components/toasts/ErrorToast";
import { Tables } from "../../../../database.types";
import { getSupabaseClient } from "@/utils/supabase/getSupabaseClient";
import { USER_ROLES } from "@/types/Constants";
import { DateTime } from "luxon";
import { SupabaseClient } from "@supabase/supabase-js";
import { fetchAddressFromId } from "@/features/dashboard/db/client/db";

export async function fetchDrivers(token: string | null): Promise<{
  drivers: Tables<"Users">[] | null;
}> {
  if (!token) {
    createErrorToast(["No token found"]);
  }
  const supabase = await getSupabaseClient(token);
  const { data, error } = await supabase.from("Users").select("*").eq("role", USER_ROLES.DRIVER);

  if (error) {
    createErrorToast(["Failed to fetch Drivers.", error.message]);
  }
  console.log("fetchDrivers", data);
  return { drivers: data };
}

export async function fetchUserById(token: string | null, userId: string): Promise<string> {
  if (!token) {
    createErrorToast(["No token found"]);
  }
  const supabase = await getSupabaseClient(token);
  const { data, error } = await supabase
    .from("Users")
    .select("first_name, last_name")
    .eq("user_id", userId)
    .single();

  if (error) {
    createErrorToast(["Failed to fetch Drivers.", error.message]);
  }
  const name = data?.first_name + " " + data?.last_name;
  return name;
}

export async function fetchWorkTrackerWeeks(
  token: string | null,
  userId: string
): Promise<string[]> {
  if (!token) {
    createErrorToast(["No token found"]);
    return [];
  }

  const supabase = await getSupabaseClient(token);

  // 1. Get all dates for the given user
  const { data, error } = await supabase.from("WorkTrackers").select("date").eq("user_id", userId);

  if (error) {
    createErrorToast(["Failed to fetch work tracker dates", error.message]);
    return [];
  }

  // 2. Normalize each date to the Monday of its week
  const mondayDates = new Set<string>();
  for (const row of data || []) {
    const date = DateTime.fromISO(row.date);
    if (date.isValid) {
      const monday = date.minus({ days: (date.weekday + 6) % 7 });
      mondayDates.add(monday.toISODate()); // format as "YYYY-MM-DD"
    }
  }
  const dates = Array.from(mondayDates).sort();
  console.log("dates", dates);

  // 3. Return a sorted list
  return dates;
}

export type WorkTrackersResult = {
  workTrackers: {
    workTracker: Tables<"WorkTrackers">;
    bleacherNumber: number | null;
    pickup_address: Tables<"Addresses"> | null;
    dropoff_address: Tables<"Addresses"> | null;
  }[];
  driverTax: number;
};

async function fetchDriverTaxByIdServer(
  userId: number,
  supabaseClient: SupabaseClient
): Promise<number> {
  const { data, error } = await supabaseClient
    .from("Drivers")
    .select("tax")
    .eq("user_id", userId)
    .single();
  if (error && error.code === "PGRST116") {
    const insertError = await insertDriverServer(userId, 0, supabaseClient);
    if (insertError) {
      return 0;
    }
    return 0;
  }
  return data?.tax ?? 0;
}

async function insertDriverServer(userId: number, tax: number, supabaseClient: SupabaseClient) {
  const { error } = await supabaseClient.from("Drivers").insert({
    user_id: userId,
    tax,
  });
  if (error) {
    throw error;
  }
  return null;
}

export async function fetchWorkTrackersForUserIdAndStartDate(
  token: string | null,
  userId: string,
  startDate: string,
  supabaseClient?: SupabaseClient // if supplied this is being called from the server
): Promise<WorkTrackersResult> {
  // console.log("supabaseClient", supabaseClient);
  if (!supabaseClient && !token) {
    createErrorToast(["No token found"]);
    // return { workTracker: [], pickUpAddress: [], dropOffAddress: [] };
  }
  let supabase: SupabaseClient;
  if (supabaseClient) {
    supabase = supabaseClient;
  } else if (token) {
    supabase = await getSupabaseClient(token);
  } else {
    throw new Error("No token found");
  }
  // const supabase = await getSupabaseClient(token);

  // 1. Get all dates for the given user
  // console.log("userId", userId);
  // console.log("startDate", startDate);
  // console.log("supabase", supabase);
  // Join the related Bleachers row to fetch bleacher_number in one query
  type WorkTrackerWithBleacher = Tables<"WorkTrackers"> & {
    bleacher: { bleacher_number: number } | null;
  };

  const { data, error } = await supabase
    .from("WorkTrackers")
    .select(
      `
      *,
      bleacher:Bleachers(bleacher_number)
    `
    )
    .eq("user_id", userId)
    .gte("date", startDate)
    .lt("date", DateTime.fromISO(startDate).plus({ days: 7 }).toISODate());
  // console.log("data", data);

  if (error) {
    // if it's being called from the server, throw an error, otherwise toast
    if (!supabaseClient) {
      createErrorToast(["Failed to fetch work trackers", error.message]);
    } else {
      throw new Error(["Failed to fetch work trackers", error.message].join("\n"));
    }
    // return [];
  }

  const result = await Promise.all(
    ((data || []) as WorkTrackerWithBleacher[]).map(async (tracker) => {
      const pickup =
        tracker.pickup_address_id != null
          ? await fetchAddressFromId(tracker.pickup_address_id, supabase, supabaseClient != null)
          : null;
      const dropoff =
        tracker.dropoff_address_id != null
          ? await fetchAddressFromId(tracker.dropoff_address_id, supabase, supabaseClient != null)
          : null;

      return {
        workTracker: tracker as Tables<"WorkTrackers">,
        bleacherNumber: tracker.bleacher?.bleacher_number ?? null,
        pickup_address: pickup,
        dropoff_address: dropoff,
      };
    })
  );

  const driverTax = await fetchDriverTaxByIdServer(Number(userId), supabase);

  return { workTrackers: result, driverTax };
}
