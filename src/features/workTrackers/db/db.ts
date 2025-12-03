import { createErrorToast } from "@/components/toasts/ErrorToast";
import { Tables } from "../../../../database.types";
import { USER_ROLES } from "@/types/Constants";
import { DateTime } from "luxon";
import { SupabaseClient } from "@supabase/supabase-js";
import { fetchAddressFromId } from "@/features/dashboard/db/client/db";

export async function fetchDriverName(
  userId: string,
  supabaseClient: SupabaseClient
): Promise<string> {
  const { data, error } = await supabaseClient
    .from("Users")
    .select("first_name, last_name")
    .eq("user_id", userId)
    .single();
  // console.log("data", data);

  if (error) {
    throw new Error(["Failed to fetch work trackers", error.message].join("\n"));
    // return [];
  }
  const name = data?.first_name + " " + data?.last_name;
  return name;
}

export async function fetchDrivers(supabase: SupabaseClient): Promise<{
  drivers: Tables<"Users">[] | null;
}> {
  if (!supabase) {
    createErrorToast(["No supabase client found"]);
  }
  const { data, error } = await supabase.from("Users").select("*").eq("role", USER_ROLES.DRIVER);

  if (error) {
    createErrorToast(["Failed to fetch Drivers.", error.message]);
  }
  console.log("fetchDrivers", data);
  return { drivers: data };
}

export async function fetchUserById(supabase: SupabaseClient, userId: string): Promise<string> {
  if (!supabase) {
    createErrorToast(["No supabase client found"]);
  }
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
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  if (!supabase) {
    createErrorToast(["No supabase client found"]);
  }

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

export async function fetchAllWorkTrackerWeeks(supabase: SupabaseClient): Promise<string[]> {
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
  supabase: SupabaseClient,
  startDate: string,
  showAllDrivers: boolean = false,
  currentUserId?: number
): Promise<{
  drivers: (Tables<"Users"> & { tripCount: number })[] | null;
}> {
  if (!supabase) {
    createErrorToast(["No supabase client found"]);
  }

  const endDate = DateTime.fromISO(startDate).plus({ days: 7 }).toISODate();

  if (showAllDrivers) {
    // Show ALL active drivers, regardless of work trackers
    const { data: users, error: usersError } = await supabase
      .from("Users")
      .select("*")
      .eq("role", USER_ROLES.DRIVER);

    if (usersError) {
      createErrorToast(["Failed to fetch drivers", usersError.message]);
      return { drivers: [] };
    }

    // Get trip counts for all drivers
    const { data: workTrackers, error: wtError } = await supabase
      .from("WorkTrackers")
      .select("user_id")
      .gte("date", startDate)
      .lt("date", endDate);

    if (wtError) {
      createErrorToast(["Failed to fetch work tracker counts", wtError.message]);
    }

    // Count trips per driver
    const tripCounts = new Map<number, number>();
    (workTrackers || []).forEach((wt) => {
      if (wt.user_id) {
        tripCounts.set(wt.user_id, (tripCounts.get(wt.user_id) || 0) + 1);
      }
    });

    const usersWithCounts = users.map((user) => ({
      ...user,
      tripCount: tripCounts.get(user.user_id) || 0,
    }));

    console.log("fetchDriversForWeek (all drivers)", usersWithCounts);
    return { drivers: usersWithCounts };
  } else {
    // Show only drivers assigned to the current account manager
    if (!currentUserId) {
      return { drivers: [] };
    }

    // First, get the account manager ID for the current user
    const { data: accountManager, error: amError } = await supabase
      .from("AccountManagers")
      .select("account_manager_id")
      .eq("user_id", currentUserId)
      .eq("is_active", true)
      .single();

    if (amError || !accountManager) {
      return { drivers: [] };
    }

    // Get all drivers assigned to this account manager
    const { data: drivers, error: driversError } = await supabase
      .from("Drivers")
      .select(
        `
        user:Users(*)
      `
      )
      .eq("account_manager_id", accountManager.account_manager_id)
      .eq("is_active", true);

    if (driversError) {
      createErrorToast(["Failed to fetch drivers for account manager", driversError.message]);
      return { drivers: [] };
    }

    // Extract user objects from the joined data
    const users = drivers
      .map((d: any) => d.user)
      .filter((u): u is Tables<"Users"> => u !== null && u.role === USER_ROLES.DRIVER);

    // Get trip counts for these drivers
    const userIds = users.map((u) => u.user_id);
    const { data: workTrackers, error: wtError } = await supabase
      .from("WorkTrackers")
      .select("user_id")
      .in("user_id", userIds)
      .gte("date", startDate)
      .lt("date", endDate);

    if (wtError) {
      createErrorToast(["Failed to fetch work tracker counts", wtError.message]);
    }

    // Count trips per driver
    const tripCounts = new Map<number, number>();
    (workTrackers || []).forEach((wt) => {
      if (wt.user_id) {
        tripCounts.set(wt.user_id, (tripCounts.get(wt.user_id) || 0) + 1);
      }
    });

    const usersWithCounts = users.map((user) => ({
      ...user,
      tripCount: tripCounts.get(user.user_id) || 0,
    }));

    console.log("fetchDriversForWeek (my drivers)", usersWithCounts);
    return { drivers: usersWithCounts };
  }
}

export async function checkUserAccess(
  supabase: SupabaseClient,
  userId: number
): Promise<{
  isAdmin: boolean;
  isAccountManager: boolean;
  accountManagerId: number | null;
}> {
  const { data: user, error: userError } = await supabase
    .from("Users")
    .select("is_admin")
    .eq("user_id", userId)
    .single();

  if (userError || !user) {
    return { isAdmin: false, isAccountManager: false, accountManagerId: null };
  }

  const { data: accountManager, error: amError } = await supabase
    .from("AccountManagers")
    .select("account_manager_id, is_active")
    .eq("user_id", userId)
    .single();

  const isAccountManager = !amError && accountManager?.is_active === true;

  return {
    isAdmin: user.is_admin ?? false,
    isAccountManager,
    accountManagerId: isAccountManager ? accountManager.account_manager_id : null,
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
  supabase: SupabaseClient,
  userId: string,
  startDate: string,
  isServer: boolean
): Promise<WorkTrackersResult> {
  // console.log("supabaseClient", supabaseClient);
  if (!supabase && !isServer) {
    createErrorToast(["No Supabase client found"]);
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
        tracker.pickup_address_id != null
          ? await fetchAddressFromId(tracker.pickup_address_id, supabase, isServer)
          : null;
      const dropoff =
        tracker.dropoff_address_id != null
          ? await fetchAddressFromId(tracker.dropoff_address_id, supabase, isServer)
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
