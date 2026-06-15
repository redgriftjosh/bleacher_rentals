import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpdateEq = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      update: (data: any) => {
        mockUpdate(data);
        return {
          eq: (_col: string, _val: string) => {
            mockUpdateEq(_col, _val);
            return Promise.resolve({ error: null });
          },
        };
      },
    }),
  }),
}));

import { PATCH } from "./route";
import { NextRequest } from "next/server";

function makeRequest(eventId: string, body: Record<string, unknown>) {
  return [
    new NextRequest(`http://localhost:3000/api/events/${eventId}/po`, {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
    { params: Promise.resolve({ eventId }) },
  ] as const;
}

describe("PATCH /api/events/[eventId]/po", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates po_number on the event", async () => {
    const [req, ctx] = makeRequest("evt-1", { poNumber: "PO-2026-001" });
    const res = await PATCH(req, ctx as any);
    expect(res.status).toBe(200);

    expect(mockUpdate).toHaveBeenCalledWith({ po_number: "PO-2026-001" });
    expect(mockUpdateEq).toHaveBeenCalledWith("id", "evt-1");
  });

  it("sets po_number to null when empty string", async () => {
    const [req, ctx] = makeRequest("evt-2", { poNumber: "" });
    const res = await PATCH(req, ctx as any);
    expect(res.status).toBe(200);

    expect(mockUpdate).toHaveBeenCalledWith({ po_number: null });
  });

  it("returns 400 when poNumber is not a string", async () => {
    const [req, ctx] = makeRequest("evt-3", { poNumber: 12345 });
    const res = await PATCH(req, ctx as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("poNumber must be a string");
  });

  it("returns 400 when poNumber is missing", async () => {
    const [req, ctx] = makeRequest("evt-4", {});
    const res = await PATCH(req, ctx as any);
    expect(res.status).toBe(400);
  });
});
