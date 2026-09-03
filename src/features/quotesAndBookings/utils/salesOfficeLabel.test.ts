import { describe, it, expect } from "vitest";
import { salesOfficeLabel } from "./salesOfficeLabel";
import type { SalesOfficeOption } from "../hooks/useSalesOffices";

const office = (over: Partial<SalesOfficeOption> = {}): SalesOfficeOption => ({
  id: "office-1",
  name: "Ontario Office",
  quickbookUuid: "qbo-1",
  stripeConnectionUuid: null,
  stateProvince: null,
  currency: "CAD",
  ...over,
});

describe("salesOfficeLabel", () => {
  it("states the office's resolved currency", () => {
    expect(salesOfficeLabel(office())).toBe("Ontario Office (CAD)");
  });

  it("follows the resolved currency, not the office address", () => {
    // The production case: the office sells in CAD because its QuickBooks
    // connection says so, and its address carries no province at all. Deriving
    // the label from the province instead labelled it USD while every other
    // screen — and the saved quote — said CAD.
    expect(salesOfficeLabel(office({ stateProvince: null, currency: "CAD" }))).toContain("(CAD)");
    expect(salesOfficeLabel(office({ stateProvince: "Ontario", currency: "USD" }))).toContain(
      "(USD)",
    );
  });

  it("still names an office that has no name", () => {
    expect(salesOfficeLabel(office({ name: "", currency: "USD" }))).toBe(" (USD)");
  });
});
