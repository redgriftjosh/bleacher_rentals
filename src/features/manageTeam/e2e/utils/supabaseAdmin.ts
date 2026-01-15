import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/../database.types";

type TypedSupabase = SupabaseClient<Database>;

type UserRow = Database["public"]["Tables"]["Users"]["Row"];
type DriverRow = Database["public"]["Tables"]["Drivers"]["Row"];
type AccountManagerRow = Database["public"]["Tables"]["AccountManagers"]["Row"];
type BleacherRow = Database["public"]["Tables"]["Bleachers"]["Row"];

function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function getSupabaseAdmin(): TypedSupabase {
  const supabaseUrl =
    process.env.E2E_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;

  const serviceRoleKey =
    process.env.E2E_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Missing Supabase URL. Set E2E_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)."
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing Supabase service role key. Set E2E_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function makeE2EEmail(prefix = "e2e") {
  const uniq = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${uniq}@example.test`;
}

export async function waitForUserByEmail(params: {
  supabase: TypedSupabase;
  email: string;
  timeoutMs?: number;
}): Promise<UserRow> {
  const { supabase, email, timeoutMs = 30_000 } = params;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const { data, error } = await supabase
      .from("Users")
      .select("*")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (error) throw error;
    if (data) return data;

    await new Promise((r) => setTimeout(r, 500));
  }

  throw new Error(`Timed out waiting for Users row for ${email}`);
}

export async function getDriverByUserUuid(params: {
  supabase: TypedSupabase;
  userUuid: string;
}): Promise<DriverRow | null> {
  const { supabase, userUuid } = params;
  const { data, error } = await supabase.from("Drivers").select("*").eq("user_uuid", userUuid).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function getAccountManagerByUserUuid(params: {
  supabase: TypedSupabase;
  userUuid: string;
}): Promise<AccountManagerRow | null> {
  const { supabase, userUuid } = params;
  const { data, error } = await supabase
    .from("AccountManagers")
    .select("*")
    .eq("user_uuid", userUuid)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function pickUnassignedBleachers(params: {
  supabase: TypedSupabase;
  season: "summer" | "winter";
  limit: number;
}): Promise<Array<{ id: string; bleacher_number: number }>> {
  const { supabase, season, limit } = params;
  const column = season === "summer" ? "summer_account_manager_uuid" : "winter_account_manager_uuid";

  const { data, error } = await supabase
    .from("Bleachers")
    .select("id, bleacher_number")
    .is(column, null)
    .order("bleacher_number", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as Array<{ id: string; bleacher_number: number }>;
}

export async function getBleachersByIds(params: {
  supabase: TypedSupabase;
  ids: string[];
}): Promise<BleacherRow[]> {
  const { supabase, ids } = params;
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("Bleachers")
    .select("*")
    .in("id", ids);

  if (error) throw error;
  return data ?? [];
}

export async function clearBleacherAssignmentsForAccountManager(params: {
  supabase: TypedSupabase;
  accountManagerId: string;
}): Promise<void> {
  const { supabase, accountManagerId } = params;

  const { error: summerError } = await supabase
    .from("Bleachers")
    .update({ summer_account_manager_uuid: null })
    .eq("summer_account_manager_uuid", accountManagerId);

  if (summerError) throw summerError;

  const { error: winterError } = await supabase
    .from("Bleachers")
    .update({ winter_account_manager_uuid: null })
    .eq("winter_account_manager_uuid", accountManagerId);

  if (winterError) throw winterError;
}

export async function cleanupE2EUserByEmail(params: {
  supabase: TypedSupabase;
  email: string;
}): Promise<void> {
  const { supabase, email } = params;

  const { data: user, error: userError } = await supabase
    .from("Users")
    .select("*")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (userError) throw userError;
  if (!user) return;

  // Remove dependent rows first
  await supabase.from("Drivers").delete().eq("user_uuid", user.id);

  const { data: am } = await supabase
    .from("AccountManagers")
    .select("id")
    .eq("user_uuid", user.id)
    .maybeSingle();

  if (am?.id) {
    await clearBleacherAssignmentsForAccountManager({ supabase, accountManagerId: am.id });
    await supabase.from("AccountManagers").delete().eq("id", am.id);
  }

  await supabase.from("Users").delete().eq("id", user.id);
}

export function isSupabaseE2EConfigured(): boolean {
  return Boolean(
    (process.env.E2E_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL) &&
      (process.env.E2E_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}
