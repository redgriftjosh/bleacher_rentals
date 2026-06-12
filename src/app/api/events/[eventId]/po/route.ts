import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const { poNumber } = await req.json();

  if (typeof poNumber !== "string") {
    return NextResponse.json({ error: "poNumber must be a string" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("Events")
    .update({ po_number: poNumber || null })
    .eq("id", eventId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
