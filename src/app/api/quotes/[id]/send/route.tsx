import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@supabase/supabase-js";
import { buildQuoteDocumentData } from "@/features/quotesAndBookings/pdf/quoteDocumentData";
import { QuotePdfDocument } from "@/features/quotesAndBookings/pdf/QuotePdfDocument";
import { sendTriggerEmail } from "@/features/automaticEmails/server/sendTriggerEmail";
import { QUOTE_SENT_CLIENT } from "@/features/automaticEmails/triggers";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Auth check
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const recipientEmails: string[] =
    body.recipientEmails ?? (body.recipientEmail ? [body.recipientEmail] : []);

  if (recipientEmails.length === 0) {
    return NextResponse.json(
      { error: "At least one recipient email is required" },
      { status: 400 },
    );
  }

  const origin = req.nextUrl.origin;

  // Build data
  const data = await buildQuoteDocumentData(id, origin);
  if (!data) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  // Generate PDF
  const pdfBuffer = await renderToBuffer(<QuotePdfDocument data={data} />);

  // Send via the automatic-email template system.
  const supabaseAdmin = getSupabaseAdmin();
  const toLine = [...new Set(recipientEmails)].join(",");

  const result = await sendTriggerEmail({
    supabaseAdmin,
    trigger: QUOTE_SENT_CLIENT,
    eventId: id,
    docData: data,
    origin,
    recipientOverride: toLine,
    attachments: [
      {
        name: `${data.quoteNumber}.pdf`,
        content: Buffer.from(pdfBuffer),
        contentType: "application/pdf",
      },
    ],
  });

  if (!result.sent) {
    return NextResponse.json({ error: result.reason }, { status: 500 });
  }

  // Resolve the Clerk user id to the app Users.id uuid for EventFiles.uploaded_by.
  // NOTE: the "quote sent" EventChangeLog entry is written client-side via
  // PowerSync (logQuoteSentLocal) so it records the current logged-in sender and
  // follows the PowerSync-first rule — see docs/POWERSYNC_ARCHITECTURE.md.
  const { data: senderUser } = await supabaseAdmin
    .from("Users")
    .select("id")
    .eq("clerk_user_id", userId)
    .maybeSingle();
  const senderUserUuid = senderUser?.id ?? null;

  // Save sent quote PDF to event-files bucket
  try {
    const pdfFileName = `${data.quoteNumber}.pdf`;
    const storagePath = `${id}/sent-quote-${Date.now()}.pdf`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("event-files")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (!uploadError) {
      await supabaseAdmin.from("EventFiles").insert({
        event_uuid: id,
        file_name: pdfFileName,
        storage_path: storagePath,
        mime_type: "application/pdf",
        file_size_bytes: pdfBuffer.byteLength,
        source: "sent_quote",
        uploaded_by: senderUserUuid,
      });
    } else {
      console.error("Failed to store sent quote PDF:", uploadError);
    }
  } catch (e) {
    console.error("Failed to store sent quote PDF (email still sent):", e);
  }

  return NextResponse.json({ success: true, sentTo: toLine });
}
