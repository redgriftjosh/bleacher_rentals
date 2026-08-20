import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

/**
 * Service-role Supabase client for seeding/cleaning up e2e fixtures directly
 * at the DB level. Needed because the admin modal (DamageReportModal.tsx /
 * _lib/photoInserts.ts) always writes upload_status: "uploaded" on insert —
 * driving the UI can never produce a 'pending' photo or a report that
 * already carries N pre-existing photos, both of which these specs need.
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

export type SeededDamageReport = {
  bleacherUuid: string;
  bleacherNumber: number;
  reportId: string;
  /** Unique per-fixture note text, used to find this report's card in the UI. */
  note: string;
  cleanup: () => Promise<void>;
};

/**
 * Seeds a bleacher + damage report + one photo per entry in `photoStatuses`
 * (each 'pending' or 'uploaded'), bypassing the UI entirely.
 */
export async function seedDamageReport(opts: {
  photoStatuses: ("pending" | "uploaded")[];
}): Promise<SeededDamageReport> {
  const supabase = adminClient();
  const note = `e2e-fixture-${randomUUID()}`;
  // bleacher_number is a smallint (max 32767); namespaced high enough to stay
  // clear of real fleet numbers while remaining in range.
  const bleacherNumber = 30000 + Math.floor(Math.random() * 2000);

  const { data: bleacher, error: bleacherError } = await supabase
    .from("Bleachers")
    .insert({ bleacher_number: bleacherNumber, bleacher_rows: 5, bleacher_seats: 50 })
    .select("id, bleacher_number")
    .single();
  if (bleacherError || !bleacher) {
    throw new Error(`fixture bleacher seed failed: ${bleacherError?.message}`);
  }

  const { data: report, error: reportError } = await supabase
    .from("DamageReports")
    .insert({
      bleacher_uuid: bleacher.id,
      seat_damage: "minor",
      haul_damage: "none",
      is_safe_to_sit: false,
      is_safe_to_haul: true,
      note,
    })
    .select("id")
    .single();
  if (reportError || !report) {
    throw new Error(`fixture report seed failed: ${reportError?.message}`);
  }

  if (opts.photoStatuses.length > 0) {
    const { error: photosError } = await supabase.from("DamageReportPhotos").insert(
      opts.photoStatuses.map((upload_status, i) => ({
        damage_report_uuid: report.id,
        photo_path: `e2e-fixtures/${report.id}/${i}.jpg`,
        upload_status,
      })),
    );
    if (photosError) {
      throw new Error(`fixture photos seed failed: ${photosError.message}`);
    }
  }

  return {
    bleacherUuid: bleacher.id,
    bleacherNumber: bleacher.bleacher_number,
    reportId: report.id,
    note,
    cleanup: async () => {
      await supabase.from("DamageReportPhotos").delete().eq("damage_report_uuid", report.id);
      await supabase.from("DamageReports").delete().eq("id", report.id);
      await supabase.from("Bleachers").delete().eq("id", bleacher.id);
    },
  };
}

/** A tiny valid PNG, small enough to stay well under MAX_PHOTO_SIZE_MB. */
export const TINY_PNG_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
