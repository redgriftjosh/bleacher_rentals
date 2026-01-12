import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../../database.types";

export type DriverWithUser = {
  driver_uuid: string;
  user_uuid: string;
  tax: number;
  pay_rate_cents: number;
  pay_currency: string;
  pay_per_unit: string;
  is_active: boolean;
  user: {
    id: string;
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
      id,
      user_uuid,
      tax,
      pay_rate_cents,
      pay_currency,
      pay_per_unit,
      is_active,
      user:Users!Drivers_user_uuid_fkey(
        id,
        first_name,
        last_name,
        email
      )
    `
    )
    .eq("is_active", true)
    .order("user_uuid");

  if (error) throw error;

  // Transform the data to ensure proper typing
  return (data as any[]).map((driver) => ({
    driver_uuid: driver.id,
    user_uuid: driver.user_uuid,
    tax: driver.tax,
    pay_rate_cents: driver.pay_rate_cents,
    pay_currency: driver.pay_currency,
    pay_per_unit: driver.pay_per_unit,
    is_active: driver.is_active,
    user: {
      id: driver.user.id,
      first_name: driver.user.first_name,
      last_name: driver.user.last_name,
      email: driver.user.email,
    },
  }));
}
