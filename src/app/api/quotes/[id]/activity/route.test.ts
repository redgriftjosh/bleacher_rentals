import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn();
const mockSelect = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === "Events") {
        return {
          select: (_cols: string) => ({
            eq: (_col: string, _val: string) => {
              mockSelect(_col, _val);
              return {
                maybeSingle: () => Promise.resolve({ data: { id: _val }, error: null }),
              };
            },
          }),
        };
      }
      return {
        insert: (row: unknown) => {
          mockInsert(row);
          return Promise.resolve({ error: null });
        },
      };
    },
  }),
}));

import { POST, ALLOWED_ACTION_TYPES } from "./route";
import { NextRequest } from "next/server";

function makeRequest(id: string, body: Record<string, unknown>) {
  return [
    new NextRequest(`http://localhost/api/quotes/${id}/activity`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
    { params: Promise.resolve({ id }) },
  ] as const;
}

describe("POST /api/quotes/[id]/activity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts a client_page_view row into EventChangeLog", async () => {
    const [req, ctx] = makeRequest("evt-1", {
      action_type: "client_page_view",
      next_value: "INV-2026-001",
    });
    const res = await POST(req, ctx as any);
    expect(res.status).toBe(204);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_uuid: "evt-1",
        action_type: "client_page_view",
        next_value: "INV-2026-001",
        changed_by_user_uuid: null,
      }),
    );
  });

  it("inserts a client_tab_change row with prev and next values", async () => {
    const [req, ctx] = makeRequest("evt-2", {
      action_type: "client_tab_change",
      field_name: "tab",
      prev_value: "Approved Quote",
      next_value: "Signed Contract",
    });
    const res = await POST(req, ctx as any);
    expect(res.status).toBe(204);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: "client_tab_change",
        field_name: "tab",
        prev_value: "Approved Quote",
        next_value: "Signed Contract",
        changed_by_user_uuid: null,
      }),
    );
  });

  it("returns 400 for action_type not in allowlist", async () => {
    const [req, ctx] = makeRequest("evt-3", { action_type: "delete_all" });
    const res = await POST(req, ctx as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid action_type");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns 400 when action_type is missing", async () => {
    const [req, ctx] = makeRequest("evt-4", { next_value: "something" });
    const res = await POST(req, ctx as any);
    expect(res.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/quotes/evt-5/activity", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req, { params: Promise.resolve({ id: "evt-5" }) } as any);
    expect(res.status).toBe(400);
  });

  it("ALLOWED_ACTION_TYPES contains all expected values", () => {
    expect(ALLOWED_ACTION_TYPES.has("client_page_view")).toBe(true);
    expect(ALLOWED_ACTION_TYPES.has("client_tab_change")).toBe(true);
    expect(ALLOWED_ACTION_TYPES.has("client_contract_signed")).toBe(true);
    expect(ALLOWED_ACTION_TYPES.has("client_po_submitted")).toBe(true);
    expect(ALLOWED_ACTION_TYPES.has("client_payment_started")).toBe(true);
    expect(ALLOWED_ACTION_TYPES.has("client_pdf_download")).toBe(true);
    expect(ALLOWED_ACTION_TYPES.has("delete_all")).toBe(false);
  });

  it("inserts null for missing optional string fields", async () => {
    const [req, ctx] = makeRequest("evt-6", { action_type: "client_contract_signed" });
    await POST(req, ctx as any);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        field_name: null,
        prev_value: null,
        next_value: null,
      }),
    );
  });
});
