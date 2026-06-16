import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { Database } from "../../../../../database.types";
import { syncAlert } from "@/features/alerts/engine";
import { getDefinitionsForEntity } from "@/features/alerts/registry";
import { todayStart, getUpcomingWindowEnd } from "@/features/alerts/util/getUpcomingWindow";

function getSupabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const windowStart = todayStart();
    const windowEnd = getUpcomingWindowEnd();

    // 1. Find all work trackers in the upcoming window → run WT alerts
    const { data: workTrackers } = await supabase
      .from("WorkTrackers")
      .select("id")
      .gte("date", windowStart)
      .lte("date", windowEnd);

    const wtDefs = getDefinitionsForEntity("work_tracker");
    for (const wt of workTrackers ?? []) {
      for (const def of wtDefs) {
        await syncAlert(def, wt.id, supabase);
      }
    }

    // 2. Find all bleacher_events in the upcoming window → run BE alerts
    const { data: bleacherEvents } = await supabase
      .from("BleacherEvents")
      .select("id, Events!inner(event_start)")
      .gte("Events.event_start", windowStart)
      .lte("Events.event_start", windowEnd);

    const beDefs = getDefinitionsForEntity("bleacher_event");
    for (const be of bleacherEvents ?? []) {
      for (const def of beDefs) {
        await syncAlert(def, be.id, supabase);
      }
    }

    // 3. Clean up alerts for past events/work trackers
    const { data: staleAlerts } = await supabase
      .from("Alerts")
      .select("id, entity_uuid, entity_type");

    for (const alert of staleAlerts ?? []) {
      if (!alert.entity_uuid) continue;

      let isPast = false;
      if (alert.entity_type === "event") {
        const { data: ev } = await supabase
          .from("Events")
          .select("event_end")
          .eq("id", alert.entity_uuid)
          .single();
        isPast = !ev || ev.event_end < windowStart;
      } else if (alert.entity_type === "bleacher_event") {
        const { data: be } = await supabase
          .from("BleacherEvents")
          .select("Events!inner(event_end)")
          .eq("id", alert.entity_uuid)
          .single();
        const ev = be?.Events && !Array.isArray(be.Events) ? be.Events : null;
        isPast = !ev || ev.event_end < windowStart;
      } else if (alert.entity_type === "work_tracker") {
        const { data: wt } = await supabase
          .from("WorkTrackers")
          .select("date")
          .eq("id", alert.entity_uuid)
          .single();
        isPast = !wt || (wt.date != null && wt.date < windowStart);
      }

      if (isPast) {
        await supabase.from("UserAlerts").delete().eq("alert_uuid", alert.id);
        await supabase.from("Alerts").delete().eq("id", alert.id);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[alerts cron] failed", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
