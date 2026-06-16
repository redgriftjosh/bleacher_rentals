import { describe, it, expect } from "vitest";
import { buildActivityPayload } from "./useQuoteActivityTracker";

// Tests cover the pure serialisation helper.
// The hook itself is tested indirectly via the integration of components;
// direct hook tests would require @testing-library/react which is not in this project.

describe("buildActivityPayload", () => {
  it("serialises all fields", () => {
    const result = JSON.parse(
      buildActivityPayload({
        action_type: "client_tab_change",
        field_name: "tab",
        prev_value: "Approved Quote",
        next_value: "Signed Contract",
      }),
    );
    expect(result).toEqual({
      action_type: "client_tab_change",
      field_name: "tab",
      prev_value: "Approved Quote",
      next_value: "Signed Contract",
    });
  });

  it("coerces undefined optional fields to null", () => {
    const result = JSON.parse(
      buildActivityPayload({ action_type: "client_page_view" }),
    );
    expect(result.field_name).toBeNull();
    expect(result.prev_value).toBeNull();
    expect(result.next_value).toBeNull();
  });

  it("preserves explicit null values", () => {
    const result = JSON.parse(
      buildActivityPayload({
        action_type: "client_contract_signed",
        next_value: "Jane Smith",
        prev_value: null,
        field_name: null,
      }),
    );
    expect(result.next_value).toBe("Jane Smith");
    expect(result.prev_value).toBeNull();
  });
});
