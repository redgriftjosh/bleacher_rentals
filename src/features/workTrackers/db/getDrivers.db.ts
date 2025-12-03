import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../../database.types";

export type DriverWithUser = {
  driver_id: number;
  user_id: number;
  tax: number;
  pay_rate_cents: number;
  pay_currency: string;
  pay_per_unit: string;
  is_active: boolean;
  user: {
    user_id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
};

export async function getDriversWithUsers(
  supabase: SupabaseClient<Database>
): Promise<DriverWithUser[]> {
  const { data, error } = await supabase
    .from("Drivers")
    .select(
      `
      driver_id,
      user_id,
      tax,
      pay_rate_cents,
      pay_currency,
      pay_per_unit,
      is_active,
      user:Users!Drivers_user_id_fkey(
        user_id,
        first_name,
        last_name,
        email
      )
    `
    )
    .eq("is_active", true)
    .order("user_id");

  if (error) throw error;

  // Transform the data to ensure proper typing
  return (data as any[]).map((driver) => ({
    driver_id: driver.driver_id,
    user_id: driver.user_id,
    tax: driver.tax,
    pay_rate_cents: driver.pay_rate_cents,
    pay_currency: driver.pay_currency,
    pay_per_unit: driver.pay_per_unit,
    is_active: driver.is_active,
    user: {
      user_id: driver.user.user_id,
      first_name: driver.user.first_name,
      last_name: driver.user.last_name,
      email: driver.user.email,
    },
  }));
}
