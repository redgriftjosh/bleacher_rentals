import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Always read the live hash columns — never serve a cached version fingerprint.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Strictly classify the public route param as an invoice number or a UUID.
 * Anything else (e.g. an injection attempt like `1;DROP TABLE`) returns null so
 * the handler can 404 without ever issuing a query. Pure — unit-tested.
 */
export function parseVersionIdParam(
  raw: string,
): { kind: "invoice_number"; value: number } | { kind: "uuid"; value: string } | null {
  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    return Number.isSafeInteger(n) ? { kind: "invoice_number", value: n } : null;
  }
  if (UUID_RE.test(raw)) {
    return { kind: "uuid", value: raw };
  }
  return null;
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * GET /api/quotes/[id]/version  (id = event UUID or invoice number)
 *
 * Returns only the two content fingerprints so the public quote page can detect a
 * manager edit and prompt a refresh. No PII is exposed.
 * See docs/specs/quote-staleness-detection.md.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const parsed = parseVersionIdParam(id);
  if (!parsed) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const supabase = getSupabaseAdmin();
  const column = parsed.kind === "invoice_number" ? "invoice_number" : "id";

  const { data, error } = await supabase
    .from("Events")
    .select("content_hash, contract_hash")
    .eq(column, parsed.value as never)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({
    contentHash: data.content_hash ?? "",
    contractHash: data.contract_hash ?? "",
  });
}
