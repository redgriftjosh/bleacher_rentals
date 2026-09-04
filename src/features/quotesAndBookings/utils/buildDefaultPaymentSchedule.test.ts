import { describe, it, expect } from "vitest";
import { buildDefaultPaymentSchedule, addDaysISO } from "./buildDefaultPaymentSchedule";

let counter = 0;
const idFn = () => `id-${counter++}`;
const today = "2026-06-23";

describe("addDaysISO", () => {
  it("subtracts days across month boundaries", () => {
    expect(addDaysISO("2026-07-03", -7)).toBe("2026-06-26");
  });
  it("adds days", () => {
    expect(addDaysISO("2026-06-23", 7)).toBe("2026-06-30");
  });
});

describe("buildDefaultPaymentSchedule", () => {
  it("splits 50/50 with signing today and remaining 7 days before a far-out event", () => {
    const s = buildDefaultPaymentSchedule(100000, "2026-08-01", today, idFn);
    expect(s).toHaveLength(2);
    expect(s[0]).toMatchObject({ dueDate: today, amountCents: 50000 });
    expect(s[1]).toMatchObject({ dueDate: "2026-07-25", amountCents: 50000 });
  });

  it("always balances to the total (odd cents go to the second half)", () => {
    const s = buildDefaultPaymentSchedule(333, "2026-08-01", today, idFn);
    expect(s[0].amountCents).toBe(166);
    expect(s[1].amountCents).toBe(167);
    expect(s[0].amountCents + s[1].amountCents).toBe(333);
  });

  it("clamps the second installment to today when the event is <7 days out", () => {
    const s = buildDefaultPaymentSchedule(100000, "2026-06-26", today, idFn); // 3 days out
    expect(s[0].dueDate).toBe(today);
    expect(s[1].dueDate).toBe(today);
  });

  it("clamps to today when the event is exactly 7 days out boundary still in future", () => {
    // 7 days before 2026-06-30 == today; should equal today, not before it
    const s = buildDefaultPaymentSchedule(100000, "2026-06-30", today, idFn);
    expect(s[1].dueDate).toBe(today);
  });

  it("clamps to today when the event is in the past", () => {
    const s = buildDefaultPaymentSchedule(100000, "2026-06-01", today, idFn);
    expect(s[1].dueDate).toBe(today);
  });

  it("defaults the second installment to today when eventStart is missing", () => {
    expect(buildDefaultPaymentSchedule(100000, null, today, idFn)[1].dueDate).toBe(today);
    expect(buildDefaultPaymentSchedule(100000, "", today, idFn)[1].dueDate).toBe(today);
  });

  it("handles a zero total", () => {
    const s = buildDefaultPaymentSchedule(0, "2026-08-01", today, idFn);
    expect(s[0].amountCents).toBe(0);
    expect(s[1].amountCents).toBe(0);
  });

  it("uses an event more than 7 days out to set the second date in the future", () => {
    const s = buildDefaultPaymentSchedule(100000, "2026-07-10", today, idFn);
    expect(s[1].dueDate).toBe("2026-07-03");
  });
});
