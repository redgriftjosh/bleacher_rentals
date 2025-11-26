import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/../database.types";

type TypedSupabaseClient = SupabaseClient<Database>;

export async function fetchUserById(supabase: TypedSupabaseClient, userId: number) {
  try {
    // 1. Fetch user data
    const { data: userData, error: userError } = await supabase
      .from("Users")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (userError) throw userError;

    // 2. Check if user is a driver (and active)
    const { data: driverData } = await supabase
      .from("Drivers")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    // 3. Check if user is an account manager (and active)
    const { data: accountManagerData } = await supabase
      .from("AccountManagers")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    // 4. If account manager, fetch bleacher assignments
    let summerBleacherIds: number[] = [];
    let winterBleacherIds: number[] = [];
    let assignedDriverIds: number[] = [];

    if (accountManagerData) {
      const { data: bleachers } = await supabase
        .from("Bleachers")
        .select("bleacher_id, summer_account_manager_id, winter_account_manager_id")
        .or(`summer_account_manager_id.eq.${userId},winter_account_manager_id.eq.${userId}`);

      if (bleachers) {
        summerBleacherIds = bleachers
          .filter((b) => b.summer_account_manager_id === userId)
          .map((b) => b.bleacher_id);
        winterBleacherIds = bleachers
          .filter((b) => b.winter_account_manager_id === userId)
          .map((b) => b.bleacher_id);
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
        status: userData.status,
        isDriver: !!driverData,
        isAccountManager: !!accountManagerData,
        tax: driverData?.tax ?? undefined,
        payRateCents: driverData?.pay_rate_cents ?? null,
        payCurrency: (driverData?.pay_currency as "CAD" | "USD") ?? "CAD",
        payPerUnit: (driverData?.pay_per_unit as "KM" | "MI" | "HR") ?? "KM",
        accountManagerId: driverData?.account_manager_id ?? null,
        summerBleacherIds,
        winterBleacherIds,
        assignedDriverIds,
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
