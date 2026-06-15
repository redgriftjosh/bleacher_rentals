import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUpdate, mockUpdateEq, mockInsert, mockSelect, mockSelectEq, mockLogInsert } = vi.hoisted(() => ({
  mockUpdate: vi.fn(),
  mockUpdateEq: vi.fn(),
  mockInsert: vi.fn(),
  mockSelect: vi.fn(),
  mockSelectEq: vi.fn(),
  mockLogInsert: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === "ContractSignatures") {
        return {
          update: (data: any) => {
            mockUpdate(data);
            return {
              eq: (_c: string, _v: string) => ({
                eq: () => Promise.resolve({ error: null }),
              }),
            };
          },
          insert: (data: any) => {
            mockInsert(data);
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: "sig-1", signed_at: "2026-06-12T10:00:00Z" },
                    error: null,
                  }),
              }),
            };
          },
        };
      }
      if (table === "Events") {
        return {
          select: () => {
            mockSelect();
            return {
              eq: (_c: string, _v: string) => {
                mockSelectEq(_c, _v);
                return {
                  single: () =>
                    Promise.resolve({
                      data: { event_status: "quoted", terms_and_conditions_uuid: "terms-1" },
                      error: null,
                    }),
                };
              },
            };
          },
          update: (data: any) => {
            mockUpdate(data);
            return { eq: () => Promise.resolve({ error: null }) };
          },
        };
      }
      if (table === "EventChangeLog") {
        return {
          insert: (data: any) => {
            mockLogInsert(data);
            return Promise.resolve({ error: null });
          },
        };
      }
      return {
        insert: vi.fn().mockReturnValue({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
        update: vi.fn().mockReturnValue({ eq: () => Promise.resolve({ error: null }) }),
        select: vi.fn().mockReturnValue({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      };
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ error: null }),
      }),
    },
  }),
}));

vi.mock("@react-pdf/renderer", () => ({
  renderToBuffer: vi.fn().mockResolvedValue(Buffer.from("pdf")),
}));

vi.mock("@/features/quotesAndBookings/pdf/quoteDocumentData", () => ({
  buildQuoteDocumentData: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/features/quotesAndBookings/pdf/QuotePdfDocument", () => ({
  QuotePdfDocument: vi.fn(),
}));

import { POST } from "./route";

function makeRequest(body: any) {
  return new Request("http://localhost:3000/api/contracts/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

describe("POST /api/contracts/sign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for missing required fields", async () => {
    const res = await POST(makeRequest({ eventId: "e-1" }));
    expect(res.status).toBe(400);
  });

  it("inserts a signature and logs the sign and status_change events", async () => {
    const req = makeRequest({
      eventId: "event-1",
      termsAndConditionsUuid: "terms-1",
      signerName: "Jane Doe",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json.signatureId).toBe("sig-1");

    // Should have logged to EventChangeLog at least twice (sign + status_change)
    expect(mockLogInsert).toHaveBeenCalledTimes(2);

    const signCall = mockLogInsert.mock.calls[0][0];
    expect(signCall).toMatchObject({
      event_uuid: "event-1",
      field_name: "signature",
      next_value: "Jane Doe",
      action_type: "sign",
    });

    const statusCall = mockLogInsert.mock.calls[1][0];
    expect(statusCall).toMatchObject({
      event_uuid: "event-1",
      field_name: "event_status",
      prev_value: "quoted",
      next_value: "booked",
      action_type: "status_change",
    });
  });
});
