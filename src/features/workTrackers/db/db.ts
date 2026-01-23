import { createErrorToast } from "@/components/toasts/ErrorToast";
import { Database, Tables } from "../../../../database.types";
import { USER_ROLES } from "@/types/Constants";
import { DateTime } from "luxon";
import { SupabaseClient } from "@supabase/supabase-js";
import { fetchAddressFromUuid } from "@/features/dashboard/db/client/db";

export async function fetchDriverName(
  userUuid: string,
  supabaseClient: SupabaseClient<Database>,
): Promise<string> {
  const { data, error } = await supabaseClient
    .from("Users")
    .select("first_name, last_name")
    .eq("id", userUuid)
    .single();
  // console.log("data", data);

  if (error) {
    throw new Error(["Failed to fetch work trackers", error.message].join("\n"));
    // return [];
  }
  const name = data?.first_name + " " + data?.last_name;
  return name;
}

export async function fetchUserByUuid(
  supabase: SupabaseClient<Database>,
  userUuid: string,
): Promise<string> {
  if (!supabase) {
    createErrorToast(["No supabase client found"]);
  }
  const { data, error } = await supabase
    .from("Users")
    .select("first_name, last_name")
    .eq("id", userUuid)
    .single();

  if (error) {
    createErrorToast(["Failed to fetch Drivers.", error.message]);
  }
  const name = data?.first_name + " " + data?.last_name;
  return name;
}

export async function fetchAllWorkTrackerWeeks(
  supabase: SupabaseClient<Database>,
): Promise<string[]> {
  if (!supabase) {
    createErrorToast(["No supabase client found"]);
  }

  // 1. Get all dates from all work trackers
  const { data, error } = await supabase.from("WorkTrackers").select("date");

  if (error) {
    createErrorToast(["Failed to fetch work tracker dates", error.message]);
    return [];
  }

  // 2. Normalize each date to the Monday of its week
  const mondayDates = new Set<string>();
  for (const row of data || []) {
    if (!row.date) continue;
    const date = DateTime.fromISO(row.date);
    if (date.isValid) {
      const monday = date.minus({ days: (date.weekday + 6) % 7 });
      mondayDates.add(monday.toISODate()); // format as "YYYY-MM-DD"
    }
  }
  const dates = Array.from(mondayDates).sort().reverse(); // Most recent first
  console.log("all weeks dates", dates);

  // 3. Return a sorted list
  return dates;
}

export async function fetchDriversForWeek(
  supabase: SupabaseClient<Database>,
  startDate: string,
  showAllDrivers: boolean = false,
  currentUserUuid?: string,
): Promise<{
  drivers: (Tables<"Users"> & { tripCount: number })[] | null;
}> {
  if (!supabase) {
    createErrorToast(["No supabase client found"]);
  }

  const endDate = DateTime.fromISO(startDate).plus({ days: 7 }).toISODate();

  if (showAllDrivers) {
    // Show ALL active drivers, regardless of work trackers
    const { data: driversData, error: driversError } = await supabase
      .from("Drivers")
      .select(
        `
        id,
        user:Users!Drivers_user_uuid_fkey(*)
      `,
      )
      .eq("is_active", true);

    if (driversError) {
      createErrorToast(["Failed to fetch drivers", driversError.message]);
      return { drivers: [] };
    }

    // Get trip counts for all drivers
    const { data: workTrackers, error: wtError } = await supabase
      .from("WorkTrackers")
      .select("driver_uuid")
      .gte("date", startDate)
      .lt("date", endDate);

    if (wtError) {
      createErrorToast(["Failed to fetch work tracker counts", wtError.message]);
    }

    // Count trips per driver
    const tripCounts = new Map<string, number>();
    (workTrackers || []).forEach((wt) => {
      if (wt.driver_uuid) {
        tripCounts.set(wt.driver_uuid, (tripCounts.get(wt.driver_uuid) || 0) + 1);
      }
    });

    // Map to user format with trip counts
    const usersWithCounts = (driversData as any[]).map((driver) => ({
      ...driver.user,
      driver_uuid: driver.id,
      tripCount: tripCounts.get(driver.id) || 0,
    }));

    console.log("fetchDriversForWeek (all drivers)", usersWithCounts);
    return { drivers: usersWithCounts };
  } else {
    // Show only drivers assigned to the current account manager
    if (!currentUserUuid) {
      return { drivers: [] };
    }

    // First, get the account manager ID for the current user
    const { data: accountManager, error: amError } = await supabase
      .from("AccountManagers")
      .select("id")
      .eq("user_uuid", currentUserUuid)
      .eq("is_active", true)
      .single();

    if (amError || !accountManager) {
      return { drivers: [] };
    }

    // Get all drivers assigned to this account manager
    const { data: driversData, error: driversError } = await supabase
      .from("Drivers")
      .select(
        `
        id,
        user:Users!Drivers_user_uuid_fkey(*)
      `,
      )
      .eq("account_manager_uuid", accountManager.id)
      .eq("is_active", true);

    if (driversError) {
      createErrorToast(["Failed to fetch drivers for account manager", driversError.message]);
      return { drivers: [] };
    }

    // Get trip counts for these drivers
    const driverUuids = (driversData as any[]).map((d) => d.id);
    const { data: workTrackers, error: wtError } = await supabase
      .from("WorkTrackers")
      .select("driver_uuid")
      .in("driver_uuid", driverUuids)
      .gte("date", startDate)
      .lt("date", endDate);

    if (wtError) {
      createErrorToast(["Failed to fetch work tracker counts", wtError.message]);
    }

    // Count trips per driver
    const tripCounts = new Map<string, number>();
    (workTrackers || []).forEach((wt) => {
      if (wt.driver_uuid) {
        tripCounts.set(wt.driver_uuid, (tripCounts.get(wt.driver_uuid) || 0) + 1);
      }
    });

    // Map to user format with trip counts
    const usersWithCounts = (driversData as any[]).map((driver) => ({
      ...driver.user,
      driver_uuid: driver.id,
      tripCount: tripCounts.get(driver.id) || 0,
    }));

    console.log("fetchDriversForWeek (my drivers)", usersWithCounts);
    return { drivers: usersWithCounts };
  }
}

export async function checkUserAccess(
  supabase: SupabaseClient<Database>,
  userUuid: string,
): Promise<{
  isAdmin: boolean;
  isAccountManager: boolean;
  accountManagerUuid: string | null;
}> {
  const { data: user, error: userError } = await supabase
    .from("Users")
    .select("is_admin")
    .eq("id", userUuid)
    .single();

  if (userError || !user) {
    return { isAdmin: false, isAccountManager: false, accountManagerUuid: null };
  }

  const { data: accountManager, error: amError } = await supabase
    .from("AccountManagers")
    .select("id, is_active")
    .eq("user_uuid", userUuid)
    .single();

  const isAccountManager = !amError && accountManager?.is_active === true;

  return {
    isAdmin: user.is_admin ?? false,
    isAccountManager,
    accountManagerUuid: isAccountManager ? accountManager.id : null,
  };
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

async function fetchDriverTaxByUuidServer(
  userUuid: string,
  supabaseClient: SupabaseClient<Database>,
): Promise<number> {
  const { data, error } = await supabaseClient
    .from("Drivers")
    .select("tax")
    .eq("user_uuid", userUuid)
    .maybeSingle();

  if (!data) {
    await insertDriverServer(userUuid, 0, supabaseClient);
    return 0;
  }

  if (error) return 0;
  return data.tax ?? 0;
}

async function insertDriverServer(
  userUuid: string,
  tax: number,
  supabaseClient: SupabaseClient<Database>,
) {
  const { error } = await supabaseClient.from("Drivers").upsert(
    {
      user_uuid: userUuid,
      tax,
    },
    { onConflict: "user_uuid", ignoreDuplicates: true },
  );
  if (error) {
    // Non-fatal here; this is a best-effort helper.
    return error;
  }
  return null;
}

export async function fetchWorkTrackersForUserUuidAndStartDate(
  supabase: SupabaseClient<Database>,
  userUuid: string,
  startDate: string,
  isServer: boolean,
): Promise<WorkTrackersResult> {
  // console.log("supabaseClient", supabaseClient);
  if (!supabase && !isServer) {
    createErrorToast(["No Supabase client found"]);
  }

  // First get the driver_uuid from the user_uuid
  const { data: driverData, error: driverError } = await supabase
    .from("Drivers")
    .select("id")
    .eq("user_uuid", userUuid)
    .single();

  if (driverError || !driverData) {
    if (!isServer) {
      createErrorToast(["Failed to fetch driver", driverError?.message || "Driver not found"]);
    } else {
      throw new Error(
        ["Failed to fetch driver", driverError?.message || "Driver not found"].join("\n"),
      );
    }
    return { workTrackers: [], driverTax: 0 };
  }

  const driverUuid = driverData.id;

  // const supabase = await getSupabaseClient(token);

  // 1. Get all dates for the given driver
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
    `,
    )
    .eq("driver_uuid", driverUuid)
    .gte("date", startDate)
    .lt("date", DateTime.fromISO(startDate).plus({ days: 7 }).toISODate());
  // console.log("data", data);

  if (error) {
    // if it's being called from the server, throw an error, otherwise toast
    if (!isServer) {
      createErrorToast(["Failed to fetch work trackers", error.message]);
    } else {
      throw new Error(["Failed to fetch work trackers", error.message].join("\n"));
    }
    // return [];
  }

  const result = await Promise.all(
    ((data || []) as WorkTrackerWithBleacher[]).map(async (tracker) => {
      const pickup =
        tracker.pickup_address_uuid != null
          ? await fetchAddressFromUuid(tracker.pickup_address_uuid, supabase, isServer)
          : null;
      const dropoff =
        tracker.dropoff_address_uuid != null
          ? await fetchAddressFromUuid(tracker.dropoff_address_uuid, supabase, isServer)
          : null;

      return {
        workTracker: tracker as Tables<"WorkTrackers">,
        bleacherNumber: tracker.bleacher?.bleacher_number ?? null,
        pickup_address: pickup,
        dropoff_address: dropoff,
      };
    }),
  );

  const driverTax = await fetchDriverTaxByUuidServer(driverUuid, supabase);

  return { workTrackers: result, driverTax };
}
