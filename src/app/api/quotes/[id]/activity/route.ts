import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const ALLOWED_ACTION_TYPES = new Set([
  "client_page_view",
  "client_tab_change",
  "client_contract_signed",
  "client_po_submitted",
  "client_payment_started",
  "client_pdf_download",
  // Client corrected the language the account manager set on their contact.
  "client_language_change",
]);

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
  }

  const { action_type, field_name, prev_value, next_value } = body as Record<string, unknown>;

  if (typeof action_type !== "string" || !ALLOWED_ACTION_TYPES.has(action_type)) {
    return NextResponse.json({ error: "Invalid action_type" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: existingEvent } = await supabase
    .from("Events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();

  if (!existingEvent) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const { error } = await supabase.from("EventChangeLog").insert({
    id: crypto.randomUUID(),
    event_uuid: eventId,
    action_type,
    field_name: typeof field_name === "string" ? field_name : null,
    prev_value: typeof prev_value === "string" ? prev_value : null,
    next_value: typeof next_value === "string" ? next_value : null,
    changed_by_user_uuid: null,
    changed_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
