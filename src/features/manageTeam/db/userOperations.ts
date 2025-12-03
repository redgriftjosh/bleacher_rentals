import { SupabaseClient } from "@supabase/supabase-js";
import { CurrentUserState } from "../state/useCurrentUserStore";
import { Database } from "@/../database.types";

type TypedSupabaseClient = SupabaseClient<Database>;

export async function createUser(
  supabase: TypedSupabaseClient,
  state: CurrentUserState
): Promise<{ success: boolean; userId?: number; error?: string }> {
  try {
    // 1. Insert into Users table
    const { data: userData, error: userError } = await supabase
      .from("Users")
      .insert({
        first_name: state.firstName,
        last_name: state.lastName,
        email: state.email.toLowerCase(),
        is_admin: state.isAdmin,
        status: 1, // Active
      })
      .select("user_id")
      .single();

    if (userError) throw userError;
    const userId = userData.user_id;

    // 2. If driver, insert into Drivers table
    if (state.isDriver) {
      const { error: driverError } = await supabase.from("Drivers").insert({
        user_id: userId,
        tax: state.tax ?? 0,
        pay_rate_cents: state.payRateCents ?? 0,
        pay_currency: state.payCurrency,
        pay_per_unit: state.payPerUnit,
        account_manager_id: state.accountManagerId,
        is_active: true,
      });

      if (driverError) throw driverError;
    }

    // 3. If account manager, insert into AccountManagers table
    if (state.isAccountManager) {
      const { error: amError } = await supabase.from("AccountManagers").insert({
        user_id: userId,
        is_active: true,
      });

      if (amError) throw amError;

      // 4. Update bleacher assignments
      await updateBleacherAssignments(supabase, userId, state);
    }

    return { success: true, userId };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function updateUser(
  supabase: TypedSupabaseClient,
  state: CurrentUserState
): Promise<{ success: boolean; error?: string }> {
  if (!state.existingUserId) {
    return { success: false, error: "No user ID provided" };
  }

  try {
    const userId = state.existingUserId;

    // 1. Update Users table
    const { error: userError } = await supabase
      .from("Users")
      .update({
        first_name: state.firstName,
        last_name: state.lastName,
        email: state.email.toLowerCase(),
        is_admin: state.isAdmin,
      })
      .eq("user_id", userId);

    if (userError) throw userError;

    // 2. Handle Driver role (check for existing driver regardless of is_active status)
    const { data: existingDriver } = await supabase
      .from("Drivers")
      .select("driver_id")
      .eq("user_id", userId)
      .single();

    if (state.isDriver) {
      if (existingDriver) {
        // Update existing driver and set to active
        const { error: driverUpdateError } = await supabase
          .from("Drivers")
          .update({
            tax: state.tax ?? 0,
            pay_rate_cents: state.payRateCents ?? 0,
            pay_currency: state.payCurrency,
            pay_per_unit: state.payPerUnit,
            account_manager_id: state.accountManagerId,
            is_active: true,
          })
          .eq("user_id", userId);

        if (driverUpdateError) throw driverUpdateError;
      } else {
        // Create new driver record
        const { error: driverInsertError } = await supabase.from("Drivers").insert({
          user_id: userId,
          tax: state.tax ?? 0,
          pay_rate_cents: state.payRateCents ?? 0,
          pay_currency: state.payCurrency,
          pay_per_unit: state.payPerUnit,
          account_manager_id: state.accountManagerId,
          is_active: true,
        });

        if (driverInsertError) throw driverInsertError;
      }
    } else if (existingDriver) {
      // Mark driver as inactive instead of deleting
      const { error: driverUpdateError } = await supabase
        .from("Drivers")
        .update({ is_active: false })
        .eq("user_id", userId);

      if (driverUpdateError) throw driverUpdateError;
    }

    // 3. Handle Account Manager role (check for existing AM regardless of is_active status)
    const { data: existingAM } = await supabase
      .from("AccountManagers")
      .select("account_manager_id")
      .eq("user_id", userId)
      .single();

    if (state.isAccountManager) {
      if (!existingAM) {
        // Create new account manager record
        const { error: amInsertError } = await supabase.from("AccountManagers").insert({
          user_id: userId,
          is_active: true,
        });

        if (amInsertError) throw amInsertError;
      } else {
        // Reactivate existing account manager
        const { error: amUpdateError } = await supabase
          .from("AccountManagers")
          .update({ is_active: true })
          .eq("user_id", userId);

        if (amUpdateError) throw amUpdateError;
      }

      // Update bleacher assignments
      await updateBleacherAssignments(supabase, userId, state);
    } else if (existingAM) {
      // Remove account manager role
      // First clear bleacher assignments
      const { error: bleacherClearError } = await supabase
        .from("Bleachers")
        .update({
          summer_account_manager_id: null,
          winter_account_manager_id: null,
        })
        .or(`summer_account_manager_id.eq.${userId},winter_account_manager_id.eq.${userId}`);

      if (bleacherClearError) throw bleacherClearError;

      // Mark account manager as inactive instead of deleting
      const { error: amUpdateError } = await supabase
        .from("AccountManagers")
        .update({ is_active: false })
        .eq("user_id", userId);

      if (amUpdateError) throw amUpdateError;
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating user:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function updateBleacherAssignments(
  supabase: TypedSupabaseClient,
  userId: number,
  state: CurrentUserState
): Promise<void> {
  // First, get the account_manager_id for this user
  const { data: amData, error: amError } = await supabase
    .from("AccountManagers")
    .select("account_manager_id")
    .eq("user_id", userId)
    .single();

  if (amError || !amData) {
    console.error("Failed to get account manager ID:", amError);
    return;
  }

  const accountManagerId = amData.account_manager_id;

  // Clear existing assignments for this account manager
  await supabase
    .from("Bleachers")
    .update({
      summer_account_manager_id: null,
    })
    .eq("summer_account_manager_id", accountManagerId);

  await supabase
    .from("Bleachers")
    .update({
      winter_account_manager_id: null,
    })
    .eq("winter_account_manager_id", accountManagerId);

  // Set new summer assignments
  if (state.summerBleacherIds.length > 0) {
    await supabase
      .from("Bleachers")
      .update({
        summer_account_manager_id: accountManagerId,
      })
      .in("bleacher_id", state.summerBleacherIds);
  }

  // Set new winter assignments
  if (state.winterBleacherIds.length > 0) {
    await supabase
      .from("Bleachers")
      .update({
        winter_account_manager_id: accountManagerId,
      })
      .in("bleacher_id", state.winterBleacherIds);
  }
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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to send invite");
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending invite:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
