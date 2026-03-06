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

  if (error) {
    throw new Error(["Failed to fetch work trackers", error.message].join("\n"));
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

  const { data, error } = await supabase.from("WorkTrackers").select("date");

  if (error) {
    createErrorToast(["Failed to fetch work tracker dates", error.message]);
    return [];
  }

  const mondayDates = new Set<string>();
  for (const row of data || []) {
    if (!row.date) continue;
    const date = DateTime.fromISO(row.date);
    if (date.isValid) {
      const monday = date.minus({ days: (date.weekday + 6) % 7 });
      mondayDates.add(monday.toISODate());
    }
  }

  return Array.from(mondayDates).sort().reverse();
}

function deriveRegion(street: string | null | undefined): "US" | "CAN" | null {
  if (!street) return null;
  const country = street.split(",").pop()?.trim();
  return country === "USA" ? "US" : country === "Canada" ? "CAN" : null;
}

export type DriverWithMeta = Tables<"Users"> & {
  driver_uuid: string;
  tripCount: number;
  totalPayCents: number;
  payCurrency: string;
  payPerUnit: string;
  totalDistanceMeters: number;
  totalDriveMinutes: number;
  region: "US" | "CAN" | null;
  workTrackerGroup?: {
    id: string;
    status: Database["public"]["Enums"]["worktracker_group_status"];
    qbo_bill_id: string | null;
    week_start: string;
    week_end: string;
  } | null;
};

export async function fetchDriversForWeek(
  supabase: SupabaseClient<Database>,
  startDate: string,
  showAllDrivers: boolean = false,
  currentUserUuid?: string,
): Promise<{
  drivers: DriverWithMeta[] | null;
}> {
  if (!supabase) {
    createErrorToast(["No supabase client found"]);
  }

  const endDate = DateTime.fromISO(startDate).plus({ days: 7 }).toISODate();
  const weekStart = startDate;
  const weekEnd = DateTime.fromISO(startDate).plus({ days: 6 }).toISODate();

  if (showAllDrivers) {
    const { data: driversData, error: driversError } = await supabase
      .from("Drivers")
      .select(
        `
        id,
        pay_currency,
        pay_per_unit,
        address:Addresses!Drivers_address_uuid_fkey(street),
        user:Users!Drivers_user_uuid_fkey(*)
      `,
      )
      .eq("is_active", true);

    if (driversError) {
      createErrorToast(["Failed to fetch drivers", driversError.message]);
      return { drivers: [] };
    }

    const { data: workTrackers, error: wtError } = await supabase
      .from("WorkTrackers")
      .select("driver_uuid, pay_cents, distance_meters, drive_minutes")
      .gte("date", startDate)
      .lt("date", endDate);

    if (wtError) {
      createErrorToast(["Failed to fetch work tracker counts", wtError.message]);
    }

    // Fetch WorkTrackerGroups for this week
    const { data: workTrackerGroups, error: wtgError } = await supabase
      .from("WorkTrackerGroups")
      .select("id, driver_uuid, status, qbo_bill_id, week_start, week_end")
      .eq("week_start", weekStart!)
      .eq("week_end", weekEnd!);

    if (wtgError) {
      console.error("Failed to fetch work tracker groups", wtgError.message);
    }

    const groupsByDriver = new Map<string, any>();
    (workTrackerGroups || []).forEach((wtg) => {
      if (wtg.driver_uuid) {
        groupsByDriver.set(wtg.driver_uuid, wtg);
      }
    });

    const tripCounts = new Map<string, number>();
    const payCents = new Map<string, number>();
    const distanceMeters = new Map<string, number>();
    const driveMinutes = new Map<string, number>();
    (workTrackers || []).forEach((wt) => {
      if (wt.driver_uuid) {
        tripCounts.set(wt.driver_uuid, (tripCounts.get(wt.driver_uuid) || 0) + 1);
        payCents.set(wt.driver_uuid, (payCents.get(wt.driver_uuid) || 0) + (wt.pay_cents || 0));
        distanceMeters.set(wt.driver_uuid, (distanceMeters.get(wt.driver_uuid) || 0) + (wt.distance_meters || 0));
        driveMinutes.set(wt.driver_uuid, (driveMinutes.get(wt.driver_uuid) || 0) + (wt.drive_minutes || 0));
      }
    });

    const drivers = (driversData as any[]).map((driver) => ({
      ...driver.user,
      driver_uuid: driver.id,
      tripCount: tripCounts.get(driver.id) || 0,
      totalPayCents: payCents.get(driver.id) || 0,
      payCurrency: driver.pay_currency ?? "USD",
      payPerUnit: driver.pay_per_unit ?? "KM",
      totalDistanceMeters: distanceMeters.get(driver.id) || 0,
      totalDriveMinutes: driveMinutes.get(driver.id) || 0,
      region: deriveRegion(driver.address?.street),
      workTrackerGroup: groupsByDriver.get(driver.id) || null,
    })) as DriverWithMeta[];

    drivers.sort((a, b) => {
      if (b.tripCount !== a.tripCount) return b.tripCount - a.tripCount;
      return (a.first_name ?? "").localeCompare(b.first_name ?? "");
    });

    console.log("fetchDriversForWeek (all drivers)", drivers);
    return { drivers };
  } else {
    if (!currentUserUuid) {
      return { drivers: [] };
    }

    const { data: accountManager, error: amError } = await supabase
      .from("AccountManagers")
      .select("id")
      .eq("user_uuid", currentUserUuid)
      .eq("is_active", true)
      .single();

    if (amError || !accountManager) {
      return { drivers: [] };
    }

    const { data: driversData, error: driversError } = await supabase
      .from("Drivers")
      .select(
        `
        id,
        pay_currency,
        pay_per_unit,
        address:Addresses!Drivers_address_uuid_fkey(street),
        user:Users!Drivers_user_uuid_fkey(*)
      `,
      )
      .eq("account_manager_uuid", accountManager.id)
      .eq("is_active", true);

    if (driversError) {
      createErrorToast(["Failed to fetch drivers for account manager", driversError.message]);
      return { drivers: [] };
    }

    const driverUuids = (driversData as any[]).map((d) => d.id);
    const { data: workTrackers, error: wtError } = await supabase
      .from("WorkTrackers")
      .select("driver_uuid, pay_cents, distance_meters, drive_minutes")
      .in("driver_uuid", driverUuids)
      .gte("date", startDate)
      .lt("date", endDate);

    if (wtError) {
      createErrorToast(["Failed to fetch work tracker counts", wtError.message]);
    }

    // Fetch WorkTrackerGroups for this week
    const { data: workTrackerGroups, error: wtgError } = await supabase
      .from("WorkTrackerGroups")
      .select("id, driver_uuid, status, qbo_bill_id, week_start, week_end")
      .in("driver_uuid", driverUuids)
      .eq("week_start", weekStart!)
      .eq("week_end", weekEnd!);

    if (wtgError) {
      console.error("Failed to fetch work tracker groups", wtgError.message);
    }

    const groupsByDriver = new Map<string, any>();
    (workTrackerGroups || []).forEach((wtg) => {
      if (wtg.driver_uuid) {
        groupsByDriver.set(wtg.driver_uuid, wtg);
      }
    });

    const tripCounts = new Map<string, number>();
    const payCents = new Map<string, number>();
    const distanceMeters = new Map<string, number>();
    const driveMinutes = new Map<string, number>();
    (workTrackers || []).forEach((wt) => {
      if (wt.driver_uuid) {
        tripCounts.set(wt.driver_uuid, (tripCounts.get(wt.driver_uuid) || 0) + 1);
        payCents.set(wt.driver_uuid, (payCents.get(wt.driver_uuid) || 0) + (wt.pay_cents || 0));
        distanceMeters.set(wt.driver_uuid, (distanceMeters.get(wt.driver_uuid) || 0) + (wt.distance_meters || 0));
        driveMinutes.set(wt.driver_uuid, (driveMinutes.get(wt.driver_uuid) || 0) + (wt.drive_minutes || 0));
      }
    });

    const drivers = (driversData as any[]).map((driver) => ({
      ...driver.user,
      driver_uuid: driver.id,
      tripCount: tripCounts.get(driver.id) || 0,
      totalPayCents: payCents.get(driver.id) || 0,
      payCurrency: driver.pay_currency ?? "USD",
      payPerUnit: driver.pay_per_unit ?? "KM",
      totalDistanceMeters: distanceMeters.get(driver.id) || 0,
      totalDriveMinutes: driveMinutes.get(driver.id) || 0,
      region: deriveRegion(driver.address?.street),
      workTrackerGroup: groupsByDriver.get(driver.id) || null,
    })) as DriverWithMeta[];

    drivers.sort((a, b) => {
      if (b.tripCount !== a.tripCount) return b.tripCount - a.tripCount;
      return (a.first_name ?? "").localeCompare(b.first_name ?? "");
    });

    console.log("fetchDriversForWeek (my drivers)", drivers);
    return { drivers };
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
  if (!supabase && !isServer) {
    createErrorToast(["No Supabase client found"]);
  }

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

  if (error) {
    if (!isServer) {
      createErrorToast(["Failed to fetch work trackers", error.message]);
    } else {
      throw new Error(["Failed to fetch work trackers", error.message].join("\n"));
    }
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
