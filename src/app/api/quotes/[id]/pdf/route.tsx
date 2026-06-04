import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { buildQuoteDocumentData } from "@/features/quotesAndBookings/pdf/quoteDocumentData";
import { QuotePdfDocument } from "@/features/quotesAndBookings/pdf/QuotePdfDocument";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const origin = req.nextUrl.origin;

  const data = await buildQuoteDocumentData(id, origin);
  if (!data) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  const buffer = await renderToBuffer(<QuotePdfDocument data={data} />);

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${data.quoteNumber}.pdf"`,
    },
  });
}
