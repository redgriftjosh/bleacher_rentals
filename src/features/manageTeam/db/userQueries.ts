import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/../database.types";

type TypedSupabaseClient = SupabaseClient<Database>;

export async function fetchUserById(supabase: TypedSupabaseClient, userUuid: string) {
  try {
    // 1. Fetch user data
    const { data: userData, error: userError } = await supabase
      .from("Users")
      .select("*")
      .eq("id", userUuid)
      .single();

    if (userError) throw userError;

    // 2. Check if user is a driver (and active)
    const { data: driverData } = await supabase
      .from("Drivers")
      .select("*")
      .eq("user_uuid", userUuid)
      .eq("is_active", true)
      .maybeSingle();

    // 3. Check if user is an account manager (and active)
    const { data: accountManagerData } = await supabase
      .from("AccountManagers")
      .select("*")
      .eq("user_uuid", userUuid)
      .eq("is_active", true)
      .maybeSingle();

    // 4. If account manager, fetch bleacher assignments
    let summerBleacherUuids: string[] = [];
    let winterBleacherUuids: string[] = [];
    let assignedDriverUuids: string[] = [];

    if (accountManagerData) {
      const accountManagerUuid = accountManagerData.id;

      const { data: bleachers } = await supabase
        .from("Bleachers")
        .select("id, summer_account_manager_uuid, winter_account_manager_uuid")
        .or(
          `summer_account_manager_uuid.eq.${accountManagerUuid},winter_account_manager_uuid.eq.${accountManagerUuid}`
        );

      if (bleachers) {
        summerBleacherUuids = bleachers
          .filter((b) => b.summer_account_manager_uuid === accountManagerUuid)
          .map((b) => b.id);
        winterBleacherUuids = bleachers
          .filter((b) => b.winter_account_manager_uuid === accountManagerUuid)
          .map((b) => b.id);
      }

      // TODO: Fetch assigned drivers when that relationship is implemented
      // For now, leaving as empty array
    }

    return {
      success: true,
      data: {
        firstName: userData.first_name,
        lastName: userData.last_name,
        email: userData.email,
        isAdmin: userData.is_admin,
        status_uuid: userData.status_uuid,
        isDriver: !!driverData,
        isAccountManager: !!accountManagerData,
        tax: driverData?.tax ?? undefined,
        payRateCents: driverData?.pay_rate_cents ?? null,
        payCurrency: (driverData?.pay_currency as "CAD" | "USD") ?? "CAD",
        payPerUnit: (driverData?.pay_per_unit as "KM" | "MI" | "HR") ?? "KM",
        accountManagerUuid: driverData?.account_manager_uuid ?? null,
        summerBleacherUuids,
        winterBleacherUuids,
        assignedDriverUuids,
      },
    };
  } catch (error) {
    console.error("Error fetching user:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
