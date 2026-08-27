import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { buildQuoteDocumentData } from "@/features/quotesAndBookings/pdf/quoteDocumentData";
import { QuotePdfDocument } from "@/features/quotesAndBookings/pdf/QuotePdfDocument";
import type { QuoteLanguage } from "@/features/quotesAndBookings/pdf/quoteLanguage";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const origin = req.nextUrl.origin;

  const data = await buildQuoteDocumentData(id, origin);
  if (!data) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  // A client who switched the page to French must not download an English PDF.
  // Anything other than an explicit, known language keeps the contact's own.
  const requested = req.nextUrl.searchParams.get("lang");
  const language: QuoteLanguage =
    requested === "en" || requested === "fr" ? requested : data.language;

  const buffer = await renderToBuffer(<QuotePdfDocument data={{ ...data, language }} />);

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${data.quoteNumber}.pdf"`,
    },
  });
}
