import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { buildQuoteDocumentData } from "@/features/quotesAndBookings/pdf/quoteDocumentData";
import { QuotePdfDocument } from "@/features/quotesAndBookings/pdf/QuotePdfDocument";
import { logSingleChange } from "@/features/quotesAndBookings/db/logEventChanges";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { eventId, termsAndConditionsUuid, signerName, expectedContractHash } = body;

  if (!eventId || !termsAndConditionsUuid || !signerName?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (typeof expectedContractHash !== "string") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const signedAt = new Date().toISOString();

  // Sign-time guard: never record a signature against changed contract terms. Compare the
  // hash the client reviewed to the live one; on mismatch abort before any write.
  // See docs/specs/quote-staleness-detection.md §9.
  const { data: eventRow, error: eventErr } = await supabase
    .from("Events")
    .select("contract_hash")
    .eq("id", eventId)
    .maybeSingle();

  if (eventErr || !eventRow) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const currentContractHash = eventRow.contract_hash ?? "";
  if (expectedContractHash !== currentContractHash) {
    return NextResponse.json({ error: "quote_changed" }, { status: 409 });
  }

  // Invalidate any existing active signature for this event
  await supabase
    .from("ContractSignatures")
    .update({ status: "invalidated", invalidated_at: new Date().toISOString() })
    .eq("event_uuid", eventId)
    .eq("status", "active");

  // Insert new active signature
  const { data, error } = await supabase
    .from("ContractSignatures")
    .insert({
      event_uuid: eventId,
      terms_and_conditions_uuid: termsAndConditionsUuid,
      signer_name: signerName.trim(),
      signed_at: signedAt,
      status: "active",
      signed_contract_hash: currentContractHash,
    })
    .select("id, signed_at")
    .single();

  if (error) {
    console.error("Failed to create contract signature:", error);
    return NextResponse.json({ error: "Failed to sign contract" }, { status: 500 });
  }

  // Update event status to "booked"
  const { data: oldEvent } = await supabase
    .from("Events")
    .select("event_status")
    .eq("id", eventId)
    .single();

  await supabase
    .from("Events")
    .update({ event_status: "booked", booked_at: signedAt })
    .eq("id", eventId);

  await logSingleChange(supabase, eventId, null, "signature", null, signerName.trim(), "sign");
  await logSingleChange(
    supabase,
    eventId,
    null,
    "event_status",
    oldEvent?.event_status ?? null,
    "booked",
    "status_change",
  );

  // Generate and store the signed PDF
  try {
    const origin = req.nextUrl.origin;
    const docData = await buildQuoteDocumentData(eventId, origin);

    if (docData) {
      const buffer = await renderToBuffer(<QuotePdfDocument data={docData} />);

      const storagePath = `${eventId}/${data.id}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("contracts")
        .upload(storagePath, buffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.error("Failed to upload signed PDF:", uploadError);
      } else {
        await supabase
          .from("ContractSignatures")
          .update({ signed_pdf_path: storagePath })
          .eq("id", data.id);

        const pdfFileName = `Signed Contract - ${docData.quoteNumber}.pdf`;
        await supabase.from("EventFiles").insert({
          event_uuid: eventId,
          file_name: pdfFileName,
          storage_path: `contracts/${storagePath}`,
          mime_type: "application/pdf",
          file_size_bytes: buffer.byteLength,
          source: "signed_contract",
          uploaded_by: null,
        });
      }
    }
  } catch (e) {
    console.error("PDF generation failed (signature still saved):", e);
  }

  return NextResponse.json({
    signatureId: data.id,
    signedAt: data.signed_at,
  });
}
