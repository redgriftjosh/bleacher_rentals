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

export type DriverHeaderInfo = {
  driverName: string;
  driverPhone: string | null;
  driverEmail: string;
  address: {
    street: string;
    city: string;
    state_province: string;
    zip_postal: string | null;
  } | null;
  vendor: {
    display_name: string;
    ein: string | null;
    hst: string | null;
  } | null;
};

export async function fetchDriverHeaderInfo(
  supabase: SupabaseClient<Database>,
  userUuid: string,
): Promise<DriverHeaderInfo> {
  const { data, error } = await supabase
    .from("Drivers")
    .select(
      `
      phone_number,
      address:Addresses!Drivers_address_uuid_fkey(street, city, state_province, zip_postal),
      vendor:Vendors(display_name, ein, hst),
      user:Users!Drivers_user_uuid_fkey(first_name, last_name, email, phone)
    `,
    )
    .eq("user_uuid", userUuid)
    .single();

  if (error || !data) {
    return { driverName: "", driverPhone: null, driverEmail: "", address: null, vendor: null };
  }

  const user = (Array.isArray(data.user) ? data.user[0] : data.user) as {
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string | null;
  } | null;
  const vendor = (Array.isArray(data.vendor) ? data.vendor[0] : data.vendor) as {
    display_name: string;
    ein: string | null;
    hst: string | null;
  } | null;
  const address = (Array.isArray(data.address) ? data.address[0] : data.address) as {
    street: string;
    city: string;
    state_province: string;
    zip_postal: string | null;
  } | null;

  return {
    driverName: `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim(),
    driverPhone: (data as any).phone_number ?? user?.phone ?? null,
    driverEmail: user?.email ?? "",
    address: address ?? null,
    vendor: vendor ?? null,
  };
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
  hasCrossBorderTrips: boolean;
  region: "US" | "CAN" | null;
  qbo_connection_uuid: string | null;
  tax: number;
  workTrackerGroup?: {
    id: string;
    status: Database["public"]["Enums"]["worktracker_group_status"];
    qbo_bill_id: string | null;
    week_start: string;
    week_end: string;
  } | null;
};

async function computeCrossBorderDriverUuids(
  supabase: SupabaseClient<Database>,
  workTrackers: { driver_uuid: string | null; dropoff_address_uuid: string | null }[],
  driverAddressMap: Map<string, string | null>,
): Promise<Set<string>> {
  const canadianDriverIds = new Set<string>();
  driverAddressMap.forEach((street, driverId) => {
    if (deriveRegion(street) === "CAN") canadianDriverIds.add(driverId);
  });

  const dropoffUuids = [
    ...new Set(
      workTrackers
        .filter(
          (wt) =>
            wt.driver_uuid && canadianDriverIds.has(wt.driver_uuid) && wt.dropoff_address_uuid,
        )
        .map((wt) => wt.dropoff_address_uuid!),
    ),
  ];

  if (dropoffUuids.length === 0) return new Set();

  const { data: addresses } = await supabase
    .from("Addresses")
    .select("id, street")
    .in("id", dropoffUuids);

  const usaAddressIds = new Set(
    (addresses || []).filter((a) => /usa|united states/i.test(a.street ?? "")).map((a) => a.id),
  );

  if (usaAddressIds.size === 0) return new Set();

  const result = new Set<string>();
  workTrackers.forEach((wt) => {
    if (
      wt.driver_uuid &&
      canadianDriverIds.has(wt.driver_uuid) &&
      wt.dropoff_address_uuid &&
      usaAddressIds.has(wt.dropoff_address_uuid)
    ) {
      result.add(wt.driver_uuid);
    }
  });
  return result;
}

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
        tax,
        address:Addresses!Drivers_address_uuid_fkey(street),
        vendor:Vendors(qbo_connection_uuid),
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
      .select("driver_uuid, pay_cents, distance_meters, drive_minutes, dropoff_address_uuid")
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
        distanceMeters.set(
          wt.driver_uuid,
          (distanceMeters.get(wt.driver_uuid) || 0) + (wt.distance_meters || 0),
        );
        driveMinutes.set(
          wt.driver_uuid,
          (driveMinutes.get(wt.driver_uuid) || 0) + (wt.drive_minutes || 0),
        );
      }
    });

    const driverAddressMap = new Map<string, string | null>();
    (driversData as any[]).forEach((d) => driverAddressMap.set(d.id, d.address?.street ?? null));
    const crossBorderDriverIds = await computeCrossBorderDriverUuids(
      supabase,
      workTrackers || [],
      driverAddressMap,
    );

    const drivers = (driversData as any[]).map((driver) => ({
      ...driver.user,
      driver_uuid: driver.id,
      tripCount: tripCounts.get(driver.id) || 0,
      totalPayCents: payCents.get(driver.id) || 0,
      payCurrency: driver.pay_currency ?? "USD",
      payPerUnit: driver.pay_per_unit ?? "KM",
      totalDistanceMeters: distanceMeters.get(driver.id) || 0,
      totalDriveMinutes: driveMinutes.get(driver.id) || 0,
      hasCrossBorderTrips: crossBorderDriverIds.has(driver.id),
      region: deriveRegion(driver.address?.street),
      tax: driver.tax ?? 0,
      qbo_connection_uuid:
        (Array.isArray(driver.vendor) ? driver.vendor[0] : driver.vendor)?.qbo_connection_uuid ??
        null,
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
        tax,
        address:Addresses!Drivers_address_uuid_fkey(street),
        vendor:Vendors(qbo_connection_uuid),
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
      .select("driver_uuid, pay_cents, distance_meters, drive_minutes, dropoff_address_uuid")
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
        distanceMeters.set(
          wt.driver_uuid,
          (distanceMeters.get(wt.driver_uuid) || 0) + (wt.distance_meters || 0),
        );
        driveMinutes.set(
          wt.driver_uuid,
          (driveMinutes.get(wt.driver_uuid) || 0) + (wt.drive_minutes || 0),
        );
      }
    });

    const driverAddressMap = new Map<string, string | null>();
    (driversData as any[]).forEach((d) => driverAddressMap.set(d.id, d.address?.street ?? null));
    const crossBorderDriverIds = await computeCrossBorderDriverUuids(
      supabase,
      workTrackers || [],
      driverAddressMap,
    );

    const drivers = (driversData as any[]).map((driver) => ({
      ...driver.user,
      driver_uuid: driver.id,
      tripCount: tripCounts.get(driver.id) || 0,
      totalPayCents: payCents.get(driver.id) || 0,
      payCurrency: driver.pay_currency ?? "USD",
      payPerUnit: driver.pay_per_unit ?? "KM",
      totalDistanceMeters: distanceMeters.get(driver.id) || 0,
      totalDriveMinutes: driveMinutes.get(driver.id) || 0,
      hasCrossBorderTrips: crossBorderDriverIds.has(driver.id),
      region: deriveRegion(driver.address?.street),
      tax: driver.tax ?? 0,
      qbo_connection_uuid:
        (Array.isArray(driver.vendor) ? driver.vendor[0] : driver.vendor)?.qbo_connection_uuid ??
        null,
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

export async function fetchDriverWithMetaForWeek(
  supabase: SupabaseClient<Database>,
  userUuid: string,
  startDate: string,
): Promise<DriverWithMeta | null> {
  const endDate = DateTime.fromISO(startDate).plus({ days: 7 }).toISODate();
  const weekStart = startDate;
  const weekEnd = DateTime.fromISO(startDate).plus({ days: 6 }).toISODate();

  const { data: driverData, error: driverError } = await supabase
    .from("Drivers")
    .select(
      `
      id,
      pay_currency,
      pay_per_unit,
      tax,
      address:Addresses!Drivers_address_uuid_fkey(street),
      vendor:Vendors(qbo_connection_uuid),
      user:Users!Drivers_user_uuid_fkey(*)
    `,
    )
    .eq("user_uuid", userUuid)
    .single();

  if (driverError || !driverData) return null;

  const driver = driverData as any;

  const { data: workTrackers } = await supabase
    .from("WorkTrackers")
    .select("driver_uuid, pay_cents, distance_meters, drive_minutes, dropoff_address_uuid")
    .eq("driver_uuid", driver.id)
    .gte("date", startDate)
    .lt("date", endDate!);

  const { data: workTrackerGroup } = await supabase
    .from("WorkTrackerGroups")
    .select("id, driver_uuid, status, qbo_bill_id, week_start, week_end")
    .eq("driver_uuid", driver.id)
    .eq("week_start", weekStart)
    .eq("week_end", weekEnd!)
    .maybeSingle();

  const totalPayCents = (workTrackers || []).reduce((acc, wt) => acc + (wt.pay_cents || 0), 0);
  const totalDistanceMeters = (workTrackers || []).reduce(
    (acc, wt) => acc + (wt.distance_meters || 0),
    0,
  );
  const totalDriveMinutes = (workTrackers || []).reduce(
    (acc, wt) => acc + (wt.drive_minutes || 0),
    0,
  );

  return {
    ...driver.user,
    driver_uuid: driver.id,
    tripCount: (workTrackers || []).length,
    totalPayCents,
    payCurrency: driver.pay_currency ?? "USD",
    payPerUnit: driver.pay_per_unit ?? "KM",
    totalDistanceMeters,
    totalDriveMinutes,
    hasCrossBorderTrips: false,
    region: deriveRegion(driver.address?.street),
    tax: driver.tax ?? 0,
    qbo_connection_uuid:
      (Array.isArray(driver.vendor) ? driver.vendor[0] : driver.vendor)?.qbo_connection_uuid ??
      null,
    workTrackerGroup: workTrackerGroup ?? null,
  } as DriverWithMeta;
}

export async function fetchCrossBorderWeekStarts(
  supabase: SupabaseClient<Database>,
  startDate: string,
  endDate: string,
): Promise<Set<string>> {
  const { data: trackers } = await supabase
    .from("WorkTrackers")
    .select("driver_uuid, date, dropoff_address_uuid")
    .gte("date", startDate)
    .lt("date", endDate);

  if (!trackers?.length) return new Set();

  const driverUuids = [
    ...new Set(trackers.filter((t) => t.driver_uuid).map((t) => t.driver_uuid!)),
  ];
  const dropoffUuids = [
    ...new Set(trackers.filter((t) => t.dropoff_address_uuid).map((t) => t.dropoff_address_uuid!)),
  ];

  const [{ data: drivers }, { data: dropoffAddresses }] = await Promise.all([
    supabase
      .from("Drivers")
      .select("id, address:Addresses!Drivers_address_uuid_fkey(street)")
      .in("id", driverUuids),
    supabase.from("Addresses").select("id, street").in("id", dropoffUuids),
  ]);

  const canadianDriverIds = new Set(
    ((drivers as any[]) || [])
      .filter((d) => deriveRegion(d.address?.street) === "CAN")
      .map((d) => d.id as string),
  );

  const usaAddressIds = new Set(
    (dropoffAddresses || [])
      .filter((a) => /usa|united states/i.test(a.street ?? ""))
      .map((a) => a.id),
  );

  const weekStarts = new Set<string>();
  trackers.forEach((t) => {
    if (
      t.driver_uuid &&
      canadianDriverIds.has(t.driver_uuid) &&
      t.dropoff_address_uuid &&
      usaAddressIds.has(t.dropoff_address_uuid) &&
      t.date
    ) {
      const date = DateTime.fromISO(t.date);
      const monday = date.minus({ days: (date.weekday + 6) % 7 });
      const isoMonday = monday.toISODate();
      if (isoMonday) weekStarts.add(isoMonday);
    }
  });
  return weekStarts;
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
    activityType: string | null;
    pickup_address: Tables<"Addresses"> | null;
    dropoff_address: Tables<"Addresses"> | null;
  }[];
  driverTax: number;
  driverAddress: Tables<"Addresses"> | null;
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
    .select("id, tax, address:Addresses!Drivers_address_uuid_fkey(*)")
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
    return { workTrackers: [], driverTax: 0, driverAddress: null };
  }

  const driverUuid = driverData.id;
  const driverTax: number = driverData.tax ?? 0;
  const driverAddress = (driverData.address as Tables<"Addresses"> | null) ?? null;

  type WorkTrackerWithBleacher = Tables<"WorkTrackers"> & {
    bleacher: { bleacher_number: number } | null;
    work_tracker_type: { display_name: string } | null;
  };

  const { data, error } = await supabase
    .from("WorkTrackers")
    .select(
      `
      *,
      bleacher:Bleachers(bleacher_number),
      work_tracker_type:WorkTrackerTypes(display_name)
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
        activityType: tracker.work_tracker_type?.display_name ?? null,
        pickup_address: pickup,
        dropoff_address: dropoff,
      };
    }),
  );

  return { workTrackers: result, driverTax, driverAddress };
}
