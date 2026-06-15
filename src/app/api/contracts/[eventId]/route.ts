import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const supabase = getSupabaseAdmin();

  // Fetch event's T&C uuid
  const { data: event } = await supabase
    .from("Events")
    .select("terms_and_conditions_uuid")
    .eq("id", eventId)
    .single();

  if (!event?.terms_and_conditions_uuid) {
    return NextResponse.json({ termsHtml: null, signature: null });
  }

  // Fetch T&C content
  const { data: terms } = await supabase
    .from("TermsAndConditions")
    .select("html_content")
    .eq("id", event.terms_and_conditions_uuid)
    .single();

  // Fetch active signature
  const { data: sig } = await supabase
    .from("ContractSignatures")
    .select("id, signer_name, signed_at, status")
    .eq("event_uuid", eventId)
    .eq("status", "active")
    .maybeSingle();

  return NextResponse.json({
    termsAndConditionsUuid: event.terms_and_conditions_uuid,
    termsHtml: terms?.html_content ?? null,
    signature: sig
      ? {
          id: sig.id,
          signerName: sig.signer_name,
          signedAt: sig.signed_at,
        }
      : null,
  });
}
