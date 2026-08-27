import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";

/**
 * Service-role client. The swap is written by the mobile app in the field, so
 * there is no web UI that can produce this state — the fixture has to reach
 * past the app and write the row itself.
 */
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY for e2e fixture seeding",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export type SeededSwap = {
  workTrackerUuid: string;
  /** Monday of the week the tracker sits in — the /work-trackers route segment. */
  weekStart: string;
  driverUserUuid: string;
  assignedNumber: number;
  actualNumber: number;
  /** Unique note text, used to find this trip's row in the list. */
  note: string;
  readBack: () => Promise<{
    actual_bleacher_uuid: string | null;
    bleacher_change_reason: string | null;
  }>;
  cleanup: () => Promise<void>;
};

/**
 * Seeds two bleachers and one work tracker for the e2e driver, in the state the
 * mobile app leaves behind: `actual_bleacher_uuid` set to something other than
 * the assigned bleacher, with a reason code.
 *
 * `confirmed: true` seeds the quiet case instead — driver took the assigned one.
 */
export async function seedBleacherSwap(
  opts: { confirmed?: boolean; reason?: string } = {},
): Promise<SeededSwap> {
  const supabase = adminClient();
  const note = `e2e-swap-${randomUUID()}`;

  const driverEmail = process.env.E2E_DRIVER_EMAIL;
  if (!driverEmail) throw new Error("Missing E2E_DRIVER_EMAIL for e2e fixture seeding");

  const { data: user, error: userError } = await supabase
    .from("Users")
    .select("id")
    .eq("email", driverEmail)
    .single();
  if (userError || !user)
    throw new Error(`fixture driver user lookup failed: ${userError?.message}`);

  const { data: driver, error: driverError } = await supabase
    .from("Drivers")
    .select("id")
    .eq("user_uuid", user.id)
    .single();
  if (driverError || !driver)
    throw new Error(`fixture driver lookup failed: ${driverError?.message}`);

  // bleacher_number is a smallint; stay clear of real fleet numbers.
  const base = 30000 + Math.floor(Math.random() * 2000);
  const { data: bleachers, error: bleacherError } = await supabase
    .from("Bleachers")
    .insert([
      { bleacher_number: base, bleacher_rows: 5, bleacher_seats: 50 },
      { bleacher_number: base + 1, bleacher_rows: 5, bleacher_seats: 50 },
    ])
    .select("id, bleacher_number");
  if (bleacherError || bleachers?.length !== 2) {
    throw new Error(`fixture bleacher seed failed: ${bleacherError?.message}`);
  }
  const assigned = bleachers[0];
  const actual = bleachers[1];

  // Every fixture gets its own far-future week. Specs run fully parallel, and
  // WorkTrackers.assign_worktracker_group_trigger creates one WorkTrackerGroup
  // per driver-week under a UNIQUE (driver_uuid, week_start) — two fixtures
  // seeding the same week race each other into a duplicate key.
  const weeksAhead = 20 + Math.floor(Math.random() * 500);
  const weekStartDt = DateTime.now().startOf("week").plus({ weeks: weeksAhead });
  const weekStart = weekStartDt.toISODate()!;
  const date = weekStartDt.plus({ days: 2 }).toISODate()!;

  const { data: workTracker, error: wtError } = await supabase
    .from("WorkTrackers")
    .insert({
      bleacher_uuid: assigned.id,
      actual_bleacher_uuid: opts.confirmed ? assigned.id : actual.id,
      bleacher_change_reason: opts.confirmed ? null : (opts.reason ?? "blocked_by_other_units"),
      driver_uuid: driver.id,
      date,
      status: "accepted",
      notes: note,
    })
    .select("id")
    .single();
  if (wtError || !workTracker)
    throw new Error(`fixture work tracker seed failed: ${wtError?.message}`);

  return {
    workTrackerUuid: workTracker.id,
    weekStart,
    driverUserUuid: user.id,
    assignedNumber: assigned.bleacher_number,
    actualNumber: actual.bleacher_number,
    note,
    readBack: async () => {
      const { data, error } = await supabase
        .from("WorkTrackers")
        .select("actual_bleacher_uuid, bleacher_change_reason")
        .eq("id", workTracker.id)
        .single();
      if (error || !data) throw new Error(`fixture read back failed: ${error?.message}`);
      return data;
    },
    cleanup: async () => {
      await supabase.from("WorkTrackers").delete().eq("id", workTracker.id);
      await supabase.from("Bleachers").delete().in("id", [assigned.id, actual.id]);
    },
  };
}
