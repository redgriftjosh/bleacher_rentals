import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../../../../../database.types";
import { eventBleacherDelivery } from "@/features/alerts/definitions/eventBleacherDelivery";
import { getAlertWindowStart, getAlertWindowEnd } from "@/features/alerts/util/alertDateWindow";

/**
 * Cron: runs daily at 6am ET (10am UTC summer / 11am UTC winter).
 * Syncs "Bleacher Delivery Not Confirmed" alerts for all booked events
 * whose event_start falls within the current alert window (today → next Sunday).
 *
 * Secured via CRON_SECRET — Vercel injects this automatically as the
 * Authorization header when it invokes the route.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const windowStart = getAlertWindowStart();
  const windowEnd = getAlertWindowEnd();

  // Format as YYYY-MM-DD for Supabase date comparisons
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  // Fetch all booked events within the alert window
  const { data: events, error: eventsError } = await supabase
    .from("Events")
    .select("id, booked, address_uuid, event_start, event_name")
    .eq("booked", true)
    .gte("event_start", fmt(windowStart))
    .lte("event_start", fmt(windowEnd));

  if (eventsError) {
    console.error("[cron/sync-alerts] Failed to fetch events:", eventsError);
    return NextResponse.json({ error: eventsError.message }, { status: 500 });
  }

  if (!events?.length) {
    return NextResponse.json({ synced: 0 });
  }

  let synced = 0;
  const errors: string[] = [];

  for (const event of events) {
    try {
      await eventBleacherDelivery.syncForEvent(
        event.id,
        {
          booked: event.booked,
          address_uuid: event.address_uuid,
          event_start: event.event_start,
          event_name: event.event_name,
        },
        null, // no saver user for cron
        null, // no owner override for cron
        supabase,
      );
      synced++;
    } catch (err) {
      console.error(`[cron/sync-alerts] Failed for event ${event.id}:`, err);
      errors.push(event.id);
    }
  }

  return NextResponse.json({ synced, errors: errors.length ? errors : undefined });
}
