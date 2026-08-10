import { SupabaseClient } from "@supabase/supabase-js";
import { CurrentUserState, TeamRoleTab } from "../state/useCurrentUserStore";
import { Database } from "@/../database.types";
import { STATUSES } from "../constants";
import {
  computeDriverZoneAssignmentChanges,
  reconcileZoneDriverMap,
} from "../logic/driverZoneAssignments";
import {
  clerkInviteErrorMessage,
  isDuplicateUserEmailError,
  toErrorMessage,
} from "../util/inviteErrorMessages";

type TypedSupabaseClient = SupabaseClient<Database>;

// Resolves the current user's admin flag via the same mechanism the RLS policies use
// (auth.jwt() -> 'sub'), so it stays consistent with the database's row-level security.
async function currentUserIsAdmin(supabase: TypedSupabaseClient): Promise<boolean> {
  const { data: roles, error } = await supabase.rpc("get_user_roles");
  if (error) throw new Error(error.message);
  return (roles ?? []).includes("admin");
}

// Whether the current actor may update the Drivers row itself (pay, contact, etc.).
// Zone-based, independent of the deprecated account_manager_uuid: admin, or an AM who
// already shares a zone with the driver. A driver not yet in any of the AM's zones is
// still added to the zone via syncDriverZoneAssignments (its own DriverZones RLS) — the
// row-detail update is simply skipped until the driver is in one of the AM's zones.
async function currentUserCanEditDriverRow(
  supabase: TypedSupabaseClient,
  driverUuid: string,
): Promise<boolean> {
  if (await currentUserIsAdmin(supabase)) return true;

  const { data: amId, error: amError } = await supabase.rpc("get_current_account_manager_id");
  if (amError) throw new Error(amError.message);
  if (!amId) return false;

  const [{ data: managedZones, error: mzError }, { data: driverZones, error: dzError }] =
    await Promise.all([
      supabase.from("AccountManagerZones").select("zone_uuid").eq("account_manager_uuid", amId),
      supabase.from("DriverZones").select("zone_uuid").eq("driver_uuid", driverUuid),
    ]);
  if (mzError) throw new Error(mzError.message);
  if (dzError) throw new Error(dzError.message);

  const managed = new Set((managedZones ?? []).map((r) => r.zone_uuid));
  return (driverZones ?? []).some((r) => managed.has(r.zone_uuid));
}

// Helper function to create or update an address
async function upsertAddress(
  supabase: TypedSupabaseClient,
  state: CurrentUserState,
  existingAddressUuid: string | null,
): Promise<string | null> {
  // Check if we have address data
  if (!state.homeAddress || !state.homeCity || !state.homeState) {
    return existingAddressUuid; // Return existing UUID if no new data
  }

  const addressData = {
    street: state.homeAddress,
    city: state.homeCity,
    state_province: state.homeState,
    zip_postal: state.homePostalCode,
  };

  if (existingAddressUuid) {
    // Update existing address
    const { error } = await supabase
      .from("Addresses")
      .update(addressData)
      .eq("id", existingAddressUuid);

    if (error) {
      console.error("Error updating address:", error);
      return existingAddressUuid;
    }
    return existingAddressUuid;
  } else {
    // Create new address
    const { data, error } = await supabase
      .from("Addresses")
      .insert(addressData)
      .select("id")
      .single();

    if (error) {
      console.error("Error creating address:", error);
      return null;
    }
    return data.id;
  }
}

// Helper function to create or update a vehicle
async function upsertVehicle(
  supabase: TypedSupabaseClient,
  state: CurrentUserState,
  existingVehicleUuid: string | null,
): Promise<string | null> {
  // Check if we have vehicle data
  if (!state.vehicleMake || !state.vehicleModel || !state.vehicleYear) {
    return existingVehicleUuid; // Return existing UUID if no new data
  }

  const vehicleData = {
    make: state.vehicleMake,
    model: state.vehicleModel,
    year: state.vehicleYear,
    vin_number: state.vehicleVin,
  };

  if (existingVehicleUuid) {
    // Update existing vehicle
    const { error } = await supabase
      .from("Vehicles")
      .update(vehicleData)
      .eq("id", existingVehicleUuid);

    if (error) {
      console.error("Error updating vehicle:", error);
      return existingVehicleUuid;
    }
    return existingVehicleUuid;
  } else {
    // Create new vehicle
    const { data, error } = await supabase
      .from("Vehicles")
      .insert(vehicleData)
      .select("id")
      .single();

    if (error) {
      console.error("Error creating vehicle:", error);
      return null;
    }
    return data.id;
  }
}

export async function createUser(
  supabase: TypedSupabaseClient,
  state: CurrentUserState,
): Promise<{ success: boolean; userUuid?: string; error?: string }> {
  try {
    // 1. Insert into Users table
    const { data: userData, error: userError } = await supabase
      .from("Users")
      .insert({
        first_name: state.firstName,
        last_name: state.lastName,
        email: state.email.toLowerCase(),
        is_admin: state.isAdmin,
        is_viewer: state.isViewer,
        status_uuid: STATUSES.invited, // Active
      })
      .select("id")
      .single();

    if (userError) {
      if (isDuplicateUserEmailError(userError)) {
        throw new Error(`A user with the email "${state.email}" already exists.`);
      }
      throw userError;
    }
    const userUuid = userData.id;

    // 2. If driver, insert into Drivers table
    if (state.isDriver) {
      // Create address if provided
      const addressUuid = await upsertAddress(supabase, state, null);

      // Create vehicle if provided
      const vehicleUuid = await upsertVehicle(supabase, state, null);

      const driverUuid = state.driverId ?? crypto.randomUUID();
      const { error: driverError } = await supabase.from("Drivers").insert({
        id: driverUuid,
        user_uuid: userUuid,
        tax: state.tax ?? 0,
        pay_rate_cents: state.payRateCents ?? 0,
        pay_currency: state.payCurrency,
        pay_per_unit: state.payPerUnit,
        vendor_uuid: state.vendorUuid,
        phone_number: state.phoneNumber,
        address_uuid: addressUuid,
        vehicle_uuid: vehicleUuid,
        license_photo_path: state.licensePhotoPath,
        insurance_photo_path: state.insurancePhotoPath,
        medical_card_photo_path: state.medicalCardPhotoPath,
        is_active: true,
      });

      if (driverError) throw driverError;

      await syncDriverZoneAssignments(supabase, driverUuid, state.assignedDriverZoneUuids);
    }

    // 3. If account manager, insert into AccountManagers table
    if (state.isAccountManager) {
      const { error: amError } = await supabase.from("AccountManagers").insert({
        user_uuid: userUuid,
        is_active: true,
      });

      if (amError) throw amError;

      // 4. Update driver assignments
      await updateDriverAssignments(supabase, userUuid, state);

      // 5. Sync zone assignments
      const { data: newAmData } = await supabase
        .from("AccountManagers")
        .select("id")
        .eq("user_uuid", userUuid)
        .single();
      if (newAmData) {
        // AccountManagerZones is admin-only per RLS; skip for non-admin actors.
        if (await currentUserIsAdmin(supabase)) {
          await syncZoneAssignments(supabase, newAmData.id, state.assignedZoneEntries);
        }
        await syncDriverZonesForAm(supabase, state.zoneDriverMap);
      }
    }

    // 5. If developer, insert into Developers table
    if (state.isDeveloper) {
      const { error: devError } = await supabase.from("Developers").insert({
        user_uuid: userUuid,
        is_active: true,
        auto_subscribe_to_new_tickets: state.autoSubscribeToNewTickets,
      });
      if (devError) throw devError;
    }

    return { success: true, userUuid };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, error: toErrorMessage(error) };
  }
}

export async function updateUser(
  supabase: TypedSupabaseClient,
  state: CurrentUserState,
): Promise<{ success: boolean; error?: string }> {
  if (!state.existingUserUuid) {
    return { success: false, error: "No user UUID provided" };
  }

  try {
    const userUuid = state.existingUserUuid;

    // Snapshot of state.zoneDriverMap, folded with whatever the driver block below does to
    // this user's own DriverZones rows in this same submit. Kept separate from state.zoneDriverMap
    // (which stays a stale, page-load snapshot) so the AM-role sync at the end of this function
    // doesn't clobber a driver-zone edit that just happened above it. See
    // docs/specs/fix-am-self-driver-zone-clobber.md.
    let zoneDriverMapForAmSync = state.zoneDriverMap;

    // 1. Update Users table
    const { error: userError } = await supabase
      .from("Users")
      .update({
        first_name: state.firstName,
        last_name: state.lastName,
        email: state.email.toLowerCase(),
        is_admin: state.isAdmin,
        is_viewer: state.isViewer,
      })
      .eq("id", userUuid);

    if (userError) throw userError;

    // 2. Handle Driver role (check for existing driver regardless of is_active status)
    const { data: existingDriver } = await supabase
      .from("Drivers")
      .select("id")
      .eq("user_uuid", userUuid)
      .single();

    if (state.isDriver) {
      // Create/update address if provided
      const addressUuid = await upsertAddress(supabase, state, state.addressUuid);

      // Create/update vehicle if provided
      const vehicleUuid = await upsertVehicle(supabase, state, state.vehicleUuid);

      if (existingDriver) {
        // Sync zones FIRST so that a zone the AM just added grants them edit rights on the
        // row update below (drivers_update RLS is zone-based). This keeps the UI and the DB
        // in agreement: if the form let the AM edit the other fields because they picked one
        // of their zones, those edits are actually saved in the same submit.
        const { toAdd, toRemove } = await syncDriverZoneAssignments(
          supabase,
          existingDriver.id,
          state.assignedDriverZoneUuids,
        );
        zoneDriverMapForAmSync = reconcileZoneDriverMap({
          zoneDriverMap: zoneDriverMapForAmSync,
          driverUuid: existingDriver.id,
          addedZoneUuids: toAdd,
          removedZoneUuids: toRemove,
        });

        // Only update the Drivers row when allowed by RLS (admin, or an AM sharing a zone
        // with the driver — which now includes any zone added just above).
        if (await currentUserCanEditDriverRow(supabase, existingDriver.id)) {
          const { error: driverUpdateError } = await supabase
            .from("Drivers")
            .update({
              tax: state.tax ?? 0,
              pay_rate_cents: state.payRateCents ?? 0,
              pay_currency: state.payCurrency,
              pay_per_unit: state.payPerUnit,
              vendor_uuid: state.vendorUuid,
              phone_number: state.phoneNumber,
              address_uuid: addressUuid,
              vehicle_uuid: vehicleUuid,
              license_photo_path: state.licensePhotoPath,
              insurance_photo_path: state.insurancePhotoPath,
              medical_card_photo_path: state.medicalCardPhotoPath,
              is_active: true,
            })
            .eq("user_uuid", userUuid);
          if (driverUpdateError) throw driverUpdateError;
        }
      } else {
        // Create new driver record
        const newDriverId = state.driverId ?? crypto.randomUUID();
        const { error: driverInsertError } = await supabase.from("Drivers").insert({
          id: newDriverId,
          user_uuid: userUuid,
          tax: state.tax ?? 0,
          pay_rate_cents: state.payRateCents ?? 0,
          pay_currency: state.payCurrency,
          pay_per_unit: state.payPerUnit,
          vendor_uuid: state.vendorUuid,
          phone_number: state.phoneNumber,
          address_uuid: addressUuid,
          vehicle_uuid: vehicleUuid,
          license_photo_path: state.licensePhotoPath,
          insurance_photo_path: state.insurancePhotoPath,
          medical_card_photo_path: state.medicalCardPhotoPath,
          is_active: true,
        });

        if (driverInsertError) throw driverInsertError;

        const { toAdd, toRemove } = await syncDriverZoneAssignments(
          supabase,
          newDriverId,
          state.assignedDriverZoneUuids,
        );
        zoneDriverMapForAmSync = reconcileZoneDriverMap({
          zoneDriverMap: zoneDriverMapForAmSync,
          driverUuid: newDriverId,
          addedZoneUuids: toAdd,
          removedZoneUuids: toRemove,
        });
      }
    } else if (existingDriver) {
      // Mark driver as inactive instead of deleting
      const { error: driverUpdateError } = await supabase
        .from("Drivers")
        .update({ is_active: false })
        .eq("user_uuid", userUuid);

      if (driverUpdateError) throw driverUpdateError;
    }

    // 3. Handle Account Manager role (check for existing AM regardless of is_active status)
    const { data: existingAM } = await supabase
      .from("AccountManagers")
      .select("id")
      .eq("user_uuid", userUuid)
      .single();

    if (state.isAccountManager) {
      if (!existingAM) {
        // Create new account manager record
        const { error: amInsertError } = await supabase.from("AccountManagers").insert({
          user_uuid: userUuid,
          is_active: true,
        });

        if (amInsertError) throw amInsertError;
      } else {
        // Reactivate existing account manager
        const { error: amUpdateError } = await supabase
          .from("AccountManagers")
          .update({ is_active: true })
          .eq("user_uuid", userUuid);

        if (amUpdateError) throw amUpdateError;
      }

      // Update driver assignments
      await updateDriverAssignments(supabase, userUuid, state);

      // Sync zone assignments
      const { data: currentAmData } = await supabase
        .from("AccountManagers")
        .select("id")
        .eq("user_uuid", userUuid)
        .single();
      if (currentAmData) {
        // Which zones an AM manages (AccountManagerZones) is admin-only per RLS.
        // A non-admin AM editing this page keeps their existing zone assignments;
        // they can still manage the drivers within their zones below.
        if (await currentUserIsAdmin(supabase)) {
          await syncZoneAssignments(supabase, currentAmData.id, state.assignedZoneEntries);
        }
        await syncDriverZonesForAm(supabase, zoneDriverMapForAmSync);
      }
    } else if (existingAM) {
      // Remove account manager role
      // Clear driver assignments
      const { error: driverClearError } = await supabase
        .from("Drivers")
        .update({ account_manager_uuid: null })
        .eq("account_manager_uuid", existingAM.id);
      if (driverClearError) throw driverClearError;

      // Mark account manager as inactive instead of deleting
      const { error: amUpdateError } = await supabase
        .from("AccountManagers")
        .update({ is_active: false })
        .eq("user_uuid", userUuid);

      if (amUpdateError) throw amUpdateError;
    }

    // 4. Handle Developer role
    const { data: existingDev } = await supabase
      .from("Developers")
      .select("id")
      .eq("user_uuid", userUuid)
      .single();

    if (state.isDeveloper) {
      if (!existingDev) {
        const { error: devInsertError } = await supabase.from("Developers").insert({
          user_uuid: userUuid,
          is_active: true,
          auto_subscribe_to_new_tickets: state.autoSubscribeToNewTickets,
        });
        if (devInsertError) throw devInsertError;
      } else {
        const { error: devUpdateError } = await supabase
          .from("Developers")
          .update({
            is_active: true,
            auto_subscribe_to_new_tickets: state.autoSubscribeToNewTickets,
          })
          .eq("user_uuid", userUuid);
        if (devUpdateError) throw devUpdateError;
      }
    } else if (existingDev) {
      const { error: devDeactivateError } = await supabase
        .from("Developers")
        .update({ is_active: false })
        .eq("user_uuid", userUuid);
      if (devDeactivateError) throw devDeactivateError;
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating user:", error);
    return { success: false, error: toErrorMessage(error) };
  }
}

async function updateDriverAssignments(
  supabase: TypedSupabaseClient,
  userUuid: string,
  state: CurrentUserState,
): Promise<void> {
  // Get the account_manager_id for this user
  const { data: amData, error: amError } = await supabase
    .from("AccountManagers")
    .select("id")
    .eq("user_uuid", userUuid)
    .single();

  if (amError || !amData) {
    console.error("Failed to get account manager ID for driver assignments:", amError);
    return;
  }

  const accountManagerUuid = amData.id;

  // Clear existing driver assignments for this account manager
  await supabase
    .from("Drivers")
    .update({ account_manager_uuid: null })
    .eq("account_manager_uuid", accountManagerUuid);

  // Set new assignments
  if (state.assignedDriverUuids.length > 0) {
    await supabase
      .from("Drivers")
      .update({ account_manager_uuid: accountManagerUuid })
      .in("id", state.assignedDriverUuids);
  }
}

async function syncDriverZoneAssignments(
  supabase: TypedSupabaseClient,
  driverUuid: string,
  selectedZoneUuids: string[],
): Promise<{ toAdd: string[]; toRemove: string[] }> {
  const { data: existingRows, error: existingError } = await supabase
    .from("DriverZones")
    .select("zone_uuid")
    .eq("driver_uuid", driverUuid);

  if (existingError) throw new Error(existingError.message);

  const existingZoneUuids = (existingRows ?? []).map((r) => r.zone_uuid);

  // Resolve identity via the same mechanism as the RLS policies (auth.jwt() -> 'sub'),
  // NOT supabase.auth.getUser(): this app authenticates through Clerk third-party auth,
  // so there is no Supabase auth user, and `user.id` would be the Clerk sub, not Users.id.
  const isAdmin = await currentUserIsAdmin(supabase);

  let manageableZoneUuids: string[] | null = null;
  if (!isAdmin) {
    const { data: currentUserUuid, error: userIdError } =
      await supabase.rpc("get_current_user_uuid");
    if (userIdError) throw new Error(userIdError.message);
    if (!currentUserUuid) throw new Error("Not authenticated");

    const { data: amRow, error: amError } = await supabase
      .from("AccountManagers")
      .select("id")
      .eq("user_uuid", currentUserUuid)
      .eq("is_active", true)
      .maybeSingle();

    if (amError) throw new Error(amError.message);
    if (!amRow) throw new Error("Not authorized to manage driver zone assignments");

    const { data: zoneRows, error: zoneError } = await supabase
      .from("AccountManagerZones")
      .select("zone_uuid")
      .eq("account_manager_uuid", amRow.id);

    if (zoneError) throw new Error(zoneError.message);
    manageableZoneUuids = (zoneRows ?? []).map((r) => r.zone_uuid);
  }

  const { toAdd, toRemove } = computeDriverZoneAssignmentChanges({
    selectedZoneUuids,
    existingZoneUuids,
    manageableZoneUuids,
  });

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("DriverZones")
      .delete()
      .eq("driver_uuid", driverUuid)
      .in("zone_uuid", toRemove);
    if (error) throw new Error(error.message);
  }

  if (toAdd.length > 0) {
    const rows = toAdd.map((zone_uuid) => ({ driver_uuid: driverUuid, zone_uuid }));
    const { error } = await supabase.from("DriverZones").insert(rows);
    if (error) throw new Error(error.message);
  }

  return { toAdd, toRemove };
}

async function syncDriverZonesForAm(
  supabase: TypedSupabaseClient,
  zoneDriverMap: Record<string, string[]>,
): Promise<void> {
  for (const [zoneId, driverUuids] of Object.entries(zoneDriverMap)) {
    await supabase.from("DriverZones").delete().eq("zone_uuid", zoneId);
    if (driverUuids.length > 0) {
      const rows = driverUuids.map((d) => ({ driver_uuid: d, zone_uuid: zoneId }));
      const { error } = await supabase.from("DriverZones").insert(rows);
      if (error) throw new Error(error.message);
    }
  }
}

async function syncZoneAssignments(
  supabase: TypedSupabaseClient,
  accountManagerUuid: string,
  entries: { zoneUuid: string; isLead: boolean }[],
): Promise<void> {
  // Delete all existing zone assignments for this AM
  await supabase
    .from("AccountManagerZones")
    .delete()
    .eq("account_manager_uuid", accountManagerUuid);

  if (entries.length === 0) return;

  const rows = entries.map((e) => ({
    account_manager_uuid: accountManagerUuid,
    zone_uuid: e.zoneUuid,
    is_lead: e.isLead,
  }));

  const { error } = await supabase.from("AccountManagerZones").insert(rows);
  if (error) throw new Error(error.message);
}

export async function sendUserInvite(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("/api/invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    if (!response.ok) {
      // The API route already resolves this to a human-readable message
      // (see clerkInviteErrorMessage in inviteErrorMessages.ts); fall back
      // to the generic Clerk-shaped mapper only if that field is missing.
      throw new Error(data.error || clerkInviteErrorMessage(data, "Failed to send invite"));
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending invite:", error);
    return { success: false, error: toErrorMessage(error) };
  }
}

export async function revokeUserInvite(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("/api/invite", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || clerkInviteErrorMessage(data, "Failed to revoke invite"));
    }

    return { success: true };
  } catch (error) {
    console.error("Error revoking invite:", error);
    return { success: false, error: toErrorMessage(error) };
  }
}

export async function fetchUserById(
  supabase: TypedSupabaseClient,
  userUuid: string,
): Promise<Partial<CurrentUserState> | null> {
  try {
    // 1. Fetch user basic info
    const { data: user, error: userError } = await supabase
      .from("Users")
      .select("*")
      .eq("id", userUuid)
      .single();

    if (userError || !user) {
      console.error("Error fetching user:", userError);
      return null;
    }

    // Build role tabs array
    const roleTabs: TeamRoleTab[] = [];
    if (user.is_admin) roleTabs.push("administrator");
    if (user.is_viewer) roleTabs.push("viewer");

    // Initialize result object
    const result: Partial<CurrentUserState> = {
      firstName: user.first_name || "",
      lastName: user.last_name || "",
      email: user.email,
      isAdmin: user.is_admin,
      isViewer: Boolean(user.is_viewer),
      statusUuid: user.status_uuid,
      phoneNumber: user.phone,
      isDriver: false,
      isAccountManager: false,
      isDeveloper: false,
    };

    // 2. Check if user is a driver
    const { data: driver, error: driverError } = await supabase
      .from("Drivers")
      .select("*, Addresses(*), Vehicles(*)")
      .eq("user_uuid", userUuid)
      .single();

    // Only process if driver exists (ignore PGRST116 "no rows" error)
    if (driver && !driverError) {
      // Only show driver tab/flag if actively enabled
      if (driver.is_active) {
        roleTabs.push("driver");
        result.isDriver = true;
      }
      // Always load driver data so re-enabling restores saved values
      result.tax = driver.tax;
      result.payRateCents = driver.pay_rate_cents;
      result.payCurrency = driver.pay_currency as "CAD" | "USD";
      result.payPerUnit = driver.pay_per_unit as "KM" | "MI" | "HR";
      result.accountManagerUuid = driver.account_manager_uuid;
      result.vendorUuid = driver.vendor_uuid;
      result.licensePhotoPath = driver.license_photo_path;
      result.insurancePhotoPath = driver.insurance_photo_path;
      result.medicalCardPhotoPath = driver.medical_card_photo_path;
      result.driverId = driver.id;
      result.phoneNumber = driver.phone_number;

      const { data: driverZoneRows } = await supabase
        .from("DriverZones")
        .select("zone_uuid")
        .eq("driver_uuid", driver.id);
      result.assignedDriverZoneUuids = (driverZoneRows ?? []).map((r) => r.zone_uuid);

      // Address info
      if (driver.Addresses) {
        result.addressUuid = driver.address_uuid;
        result.homeAddress = driver.Addresses.street;
        result.homeCity = driver.Addresses.city;
        result.homeState = driver.Addresses.state_province;
        result.homePostalCode = driver.Addresses.zip_postal;
      }

      // Vehicle info
      if (driver.Vehicles) {
        result.vehicleUuid = driver.vehicle_uuid;
        result.vehicleMake = driver.Vehicles.make;
        result.vehicleModel = driver.Vehicles.model;
        result.vehicleYear = driver.Vehicles.year;
        result.vehicleVin = driver.Vehicles.vin_number;
      }
    }

    // 3. Check if user is an account manager
    const { data: accountManager, error: accountManagerError } = await supabase
      .from("AccountManagers")
      .select("*")
      .eq("user_uuid", userUuid)
      .single();

    // Only process if account manager exists (ignore PGRST116 "no rows" error)
    if (accountManager && !accountManagerError) {
      // Only show AM tab/flag if actively enabled
      if (accountManager.is_active) {
        roleTabs.push("account-manager");
        result.isAccountManager = true;
      }

      const accountManagerId = accountManager.id;

      // Fetch drivers assigned to this account manager
      const { data: assignedDrivers } = await supabase
        .from("Drivers")
        .select("id")
        .eq("account_manager_uuid", accountManagerId)
        .eq("is_active", true);

      result.assignedDriverUuids = assignedDrivers?.map((d) => d.id) || [];

      // Fetch zone assignments for this account manager
      const { data: zoneRows } = await supabase
        .from("AccountManagerZones")
        .select("zone_uuid, is_lead")
        .eq("account_manager_uuid", accountManagerId);

      result.assignedZoneEntries = (zoneRows || []).map((r) => ({
        zoneUuid: r.zone_uuid,
        isLead: r.is_lead ?? false,
      }));

      // Load driver assignments for each of this AM's zones
      const zoneIds = (zoneRows || []).map((r) => r.zone_uuid);
      const zoneDriverMap: Record<string, string[]> = {};
      if (zoneIds.length > 0) {
        const { data: driverZoneRows } = await supabase
          .from("DriverZones")
          .select("zone_uuid, driver_uuid")
          .in("zone_uuid", zoneIds);
        for (const row of driverZoneRows || []) {
          if (!zoneDriverMap[row.zone_uuid]) zoneDriverMap[row.zone_uuid] = [];
          zoneDriverMap[row.zone_uuid].push(row.driver_uuid);
        }
      }
      result.zoneDriverMap = zoneDriverMap;
    }

    // 4. Check if user is a developer
    const { data: developer } = await supabase
      .from("Developers")
      .select("id, is_active, auto_subscribe_to_new_tickets")
      .eq("user_uuid", userUuid)
      .single();

    if (developer && developer.is_active) {
      roleTabs.push("developer");
      result.isDeveloper = true;
      result.autoSubscribeToNewTickets = developer.auto_subscribe_to_new_tickets ?? true;
    }

    result.roleTabs = roleTabs;

    return result;
  } catch (error) {
    console.error("Error in fetchUserById:", error);
    return null;
  }
}
