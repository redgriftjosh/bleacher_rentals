import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { renderToBuffer } from "@react-pdf/renderer";
import * as postmark from "postmark";
import { buildQuoteDocumentData } from "@/features/quotesAndBookings/pdf/quoteDocumentData";
import { QuotePdfDocument } from "@/features/quotesAndBookings/pdf/QuotePdfDocument";
import { buildQuoteEmailHtml } from "@/features/quotesAndBookings/pdf/quoteEmailHtml";

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
  const { recipientEmail } = await req.json();

  if (!recipientEmail) {
    return NextResponse.json({ error: "recipientEmail is required" }, { status: 400 });
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

  try {
    await client.sendEmail({
      From: fromEmail,
      To: recipientEmail,
      Subject: `Quote ${data.quoteNumber} from ${data.company.name}`,
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

  return NextResponse.json({ success: true, sentTo: recipientEmail });
}
