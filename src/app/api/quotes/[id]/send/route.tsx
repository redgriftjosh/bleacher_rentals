import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { renderToBuffer } from "@react-pdf/renderer";
import * as postmark from "postmark";
import { buildQuoteDocumentData } from "@/features/quotesAndBookings/pdf/quoteDocumentData";
import { QuotePdfDocument } from "@/features/quotesAndBookings/pdf/QuotePdfDocument";
import { buildQuoteEmailHtml } from "@/features/quotesAndBookings/pdf/quoteEmailHtml";
import { logSingleChange } from "@/features/quotesAndBookings/db/logEventChanges";
import { toSenderEmail } from "@/lib/senderEmail";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Auth check
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const recipientEmails: string[] = body.recipientEmails ?? (body.recipientEmail ? [body.recipientEmail] : []);

  if (recipientEmails.length === 0) {
    return NextResponse.json({ error: "At least one recipient email is required" }, { status: 400 });
  }

  // Check Postmark config
  const apiKey = process.env.POSTMARK_API_KEY;
  const fromEmail = process.env.POSTMARK_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    return NextResponse.json({ error: "Postmark not configured" }, { status: 500 });
  }

  const origin = req.nextUrl.origin;

  // Build data
  const data = await buildQuoteDocumentData(id, origin);
  if (!data) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  // Generate PDF
  const pdfBuffer = await renderToBuffer(<QuotePdfDocument data={data} />);

  // Build email HTML
  const htmlBody = buildQuoteEmailHtml(data);

  // Send via Postmark
  const client = new postmark.ServerClient(apiKey);

  const senderEmail = data.accountManagerEmail
    ? toSenderEmail(data.accountManagerEmail)
    : fromEmail;
  const senderFrom = data.accountManager
    ? `${data.accountManager} <${senderEmail}>`
    : senderEmail;

  const toLine = [...new Set(recipientEmails)].join(",");

  try {
    await client.sendEmail({
      From: senderFrom,
      To: toLine,
      Subject: `Invoice ${data.quoteNumber} from ${data.company.name}`,
      HtmlBody: htmlBody,
      MessageStream: "outbound",
      Attachments: [
        {
          Name: `${data.quoteNumber}.pdf`,
          Content: Buffer.from(pdfBuffer).toString("base64"),
          ContentType: "application/pdf",
          ContentID: "",
        },
      ],
    });
  } catch (e: any) {
    console.error("Postmark send failed:", e);
    return NextResponse.json(
      { error: "Failed to send email", details: e.message },
      { status: 500 },
    );
  }

  // Log the send action and store PDF in EventFiles
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  await logSingleChange(supabase, id, userId, "email_sent", null, toLine, "send");

  // Save sent quote PDF to event-files bucket
  try {
    const pdfFileName = `${data.quoteNumber}.pdf`;
    const storagePath = `${id}/sent-quote-${Date.now()}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("event-files")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (!uploadError) {
      await supabase.from("EventFiles").insert({
        event_uuid: id,
        file_name: pdfFileName,
        storage_path: storagePath,
        mime_type: "application/pdf",
        file_size_bytes: pdfBuffer.byteLength,
        source: "sent_quote",
        uploaded_by: userId,
      });
    } else {
      console.error("Failed to store sent quote PDF:", uploadError);
    }
  } catch (e) {
    console.error("Failed to store sent quote PDF (email still sent):", e);
  }

  return NextResponse.json({ success: true, sentTo: toLine });
}
