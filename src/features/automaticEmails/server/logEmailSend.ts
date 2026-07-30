import type { SupabaseClient } from "@supabase/supabase-js";
import type { SendResult } from "./sendTriggerEmail";

/**
 * Persists one row to EventEmailLog. Best-effort — never throws so a logging
 * failure cannot break the caller's flow.
 */
export async function logEmailSend(
  supabase: SupabaseClient<any>,
  opts: {
    eventId: string;
    trigger: string;
    result: SendResult;
    templateId?: string | null;
  },
): Promise<void> {
  try {
    await supabase.from("EventEmailLog").insert({
      event_uuid: opts.eventId,
      trigger: opts.trigger,
      status: opts.result.sent ? "sent" : "failed",
      reason: opts.result.sent ? null : opts.result.reason,
      to_email: opts.result.sent ? opts.result.to : null,
      template_id: opts.templateId ?? null,
    });
  } catch (e) {
    console.error("[automatic-emails] Failed to write EventEmailLog row:", e);
  }
}
